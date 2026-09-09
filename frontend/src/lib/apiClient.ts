/**
 * Einheitlicher fetch-Wrapper:
 * - Token-Header (Authorization: Token …)
 * - AbortController-Timeout (15s)
 * - Retry mit Backoff für GET (max 3)
 * - DRF-Fehlerparsing
 */

import { getBaseUrl } from '../config/env';
import { TIMING } from '../config/constants';
import { reportServerReachability } from './serverStatus';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export class TimeoutError extends Error {
  constructor() {
    super('Zeitüberschreitung bei der Verbindung');
    this.name = 'TimeoutError';
  }
}

export class NetworkError extends Error {
  constructor(message = 'Netzwerkfehler') {
    super(message);
    this.name = 'NetworkError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  timeout?: number;
  /** Retries nur sinnvoll für idempotente GETs; Default abhängig von Methode. */
  retries?: number;
  signal?: AbortSignal;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Extrahiert eine lesbare Fehlermeldung aus einer DRF-Antwort. */
function parseDrfError(status: number, body: unknown): string {
  if (typeof body === 'string' && body.trim()) return body;
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    if (typeof obj.detail === 'string') return obj.detail;
    if (typeof obj.non_field_errors === 'object' && Array.isArray(obj.non_field_errors)) {
      return (obj.non_field_errors as unknown[]).join(' ');
    }
    const parts: string[] = [];
    for (const [field, value] of Object.entries(obj)) {
      const text = Array.isArray(value) ? value.join(' ') : String(value);
      parts.push(`${field}: ${text}`);
    }
    if (parts.length) return parts.join('\n');
  }
  return `HTTP ${status}`;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeout: number,
  externalSignal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      if (externalSignal?.aborted) throw error;
      throw new TimeoutError();
    }
    throw new NetworkError(error instanceof Error ? error.message : undefined);
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    token,
    timeout = TIMING.API_TIMEOUT,
    retries = method === 'GET' ? TIMING.MAX_RETRIES : 0,
    signal,
  } = options;

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Token ${token}`;

  const init: RequestInit = {
    method,
    headers,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  };

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, init, timeout, signal);
      if (getBaseUrl() === baseUrl) reportServerReachability(response.status < 500);

      if (!response.ok) {
        let errorBody: unknown = null;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = await response.text().catch(() => null);
        }
        // 4xx nicht wiederholen (außer 429); 5xx darf retryen.
        const retriable = response.status >= 500 || response.status === 429;
        const apiError = new ApiError(parseDrfError(response.status, errorBody), response.status, errorBody);
        if (!retriable || attempt === retries) throw apiError;
        lastError = apiError;
      } else {
        if (response.status === 204) return undefined as T;
        const text = await response.text();
        return (text ? JSON.parse(text) : undefined) as T;
      }
    } catch (error) {
      if (getBaseUrl() === baseUrl && (error instanceof NetworkError || error instanceof TimeoutError)) {
        reportServerReachability(false);
      }
      // ApiError für nicht-retrierbare Fälle direkt durchreichen
      if (error instanceof ApiError && (error.status < 500 && error.status !== 429)) throw error;
      lastError = error;
      if (attempt === retries) break;
    }

    await delay(TIMING.RETRY_DELAY * (attempt + 1));
  }

  throw lastError instanceof Error ? lastError : new NetworkError();
}

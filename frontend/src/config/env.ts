/**
 * Runtime-konfigurierbare Umgebung.
 *
 * Die Backend-URL kann zur Laufzeit (im Login) geändert und in Dexie persistiert
 * werden. VITE_API_BASE_URL liefert nur den Build-Default.
 */

import { reportServerReachability } from '../lib/serverStatus';

const DEFAULT_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';

let runtimeBaseUrl = DEFAULT_BASE_URL;

/** Entfernt abschließende Slashes, damit Endpunkte sauber konkateniert werden. */
export function normalizeBaseUrl(url: string): string {
  if (!url.trim()) return '';
  const parsed = new URL(url.trim());
  if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
    throw new Error('Bitte nur die Server-Adresse ohne Pfad oder Zugangsdaten eingeben.');
  }
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname))) {
    throw new Error('Der Server muss HTTPS verwenden.');
  }
  return parsed.origin;
}

export function getBaseUrl(): string {
  return runtimeBaseUrl;
}

export function setBaseUrl(url: string): void {
  const normalized = normalizeBaseUrl(url);
  if (normalized !== runtimeBaseUrl) reportServerReachability(null);
  runtimeBaseUrl = normalized;
}

export const DEFAULT_API_BASE_URL = normalizeBaseUrl(DEFAULT_BASE_URL);

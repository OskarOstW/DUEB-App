import { apiRequest } from '../lib/apiClient';
import { useSessionStore } from '../app/sessionStore';

/** Aktuelles Auth-Token der Sitzung (außerhalb von React lesbar). */
export function currentToken(): string | null {
  return useSessionStore.getState().session?.token ?? null;
}

/** Besitzer-Schluessel der lokalen Entwuerfe (pro Beobachter/Konto, ausserhalb React lesbar). */
export function currentOwner(): string {
  const s = useSessionStore.getState().session;
  if (!s) throw new Error('Bitte erneut anmelden.');
  return `${s.serverUrl}|${s.role}|${s.accountId ?? s.username}`;
}

/** apiRequest mit automatisch gesetztem Session-Token. */
export async function authedGet<T>(endpoint: string): Promise<T> {
  const token = currentToken();
  const result = await apiRequest<T>(endpoint, { token });
  if (currentToken() !== token) throw new Error('Das Konto wurde gewechselt.');
  return result;
}

export function authedPost<T>(endpoint: string, body: unknown): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'POST', body, token: currentToken() });
}

export function authedDelete<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'DELETE', token: currentToken() });
}

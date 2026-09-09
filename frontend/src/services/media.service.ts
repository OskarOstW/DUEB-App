import { getBaseUrl } from '../config/env';
import { currentToken } from './http';
import { blobToDataUrl } from '../utils/image';

export async function downloadMedia(url: string): Promise<Blob> {
  const base = new URL(getBaseUrl() || window.location.origin);
  const target = new URL(url, base);
  if (target.origin !== base.origin || !target.pathname.startsWith('/media/')) {
    throw new Error('Ungültige Medienadresse.');
  }
  const response = await fetch(target, {
    headers: { Authorization: `Token ${currentToken()}` },
    signal: AbortSignal.timeout(30000), cache: 'no-store', redirect: 'error',
  });
  if (!response.ok) throw new Error('Bild konnte nicht geladen werden. Bitte erneut anmelden oder später versuchen.');
  return response.blob();
}

export async function mediaDataUrl(url: string): Promise<string> {
  return blobToDataUrl(await downloadMedia(url));
}

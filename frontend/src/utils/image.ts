/** Bildverarbeitung fürs Web: Skalieren, Komprimieren, base64-Kodierung. */

import { getBaseUrl } from '../config/env';

/**
 * Löst eine vom Backend gelieferte Bild-URL auf. Absolute URLs (http/https/data)
 * bleiben unverändert; relative Pfade (z. B. "/media/...") werden an die aktuelle
 * Backend-Basis-URL gehängt.
 */
export function resolveMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const base = getBaseUrl();
  if (!base) return url;
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

/** Skaliert/komprimiert eine Bilddatei zu einem JPEG-Blob (max. 1600px Kante). */
export async function compressImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Die Bildverarbeitung ist auf diesem Gerät nicht verfügbar.');
    for (const dimension of [MAX_DIMENSION, 1200, 800]) {
      const scale = Math.min(1, dimension / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
      if (blob && blob.size <= 2 * 1024 * 1024) return blob;
    }
    throw new Error('Das Bild konnte nicht auf die erlaubten 2 MiB verkleinert werden.');
  } finally {
    bitmap.close();
  }
}

/** Wandelt einen Blob in eine base64-Data-URI (fürs Sende-Payload). */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

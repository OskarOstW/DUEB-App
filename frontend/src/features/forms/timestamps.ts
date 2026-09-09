import type { TimestampEntry } from '../../types';

const DE_FORMAT: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

/** Formatiert ein Datum als de-DE-Zeitstempel (TT.MM.JJJJ, HH:MM). */
export function formatTimestamp(date: Date): string {
  return date.toLocaleString('de-DE', DE_FORMAT);
}

/** Erzeugt einen neuen Zeitstempel-Eintrag mit aktueller Zeit. */
export function createTimestamp(): TimestampEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: formatTimestamp(new Date()),
    note: '',
  };
}

/** Parst einen de-DE-Zeitstempel ("TT.MM.JJJJ, HH:MM") zurück in ein Date. */
export function parseTimestamp(value: string): Date | null {
  const match = value.match(/(\d{2})\.(\d{2})\.(\d{4}),?\s+(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh, min] = match;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
  return Number.isNaN(date.getTime()) ? null : date;
}

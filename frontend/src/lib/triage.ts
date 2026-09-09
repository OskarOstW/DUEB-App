/**
 * Triage-Mapping für die UI (Sichtungskategorien → Design-Tokens).
 * Römische Varianten wie "SK IV" werden vor ihrem Präfix "SK I" geprüft.
 * Die Farbtöne sind in `index.css` als `--triage-*` definiert.
 */

export type TriageKey = 'sk1' | 'sk2' | 'sk3' | 'sk4' | 'dead' | 'unknown';

export function triageKey(category?: string | null): TriageKey {
  if (!category) return 'unknown';
  const c = category.toString().toLowerCase().trim();
  if (c.includes('sk 4') || c.includes('sk iv') || c === 'sk4' || c === '4' || c === 'iv') return 'sk4';
  if (c.includes('sk 3') || c.includes('sk iii') || c === 'sk3' || c === '3' || c === 'iii') return 'sk3';
  if (c.includes('sk 2') || c.includes('sk ii') || c === 'sk2' || c === '2' || c === 'ii') return 'sk2';
  if (c.includes('sk 1') || c.includes('sk i') || c === 'sk1' || c === '1' || c === 'i') return 'sk1';
  if (c.includes('tot') || c.includes('dead') || c.includes('verstorben') || c === 'ex') return 'dead';
  return 'unknown';
}

/** Tailwind-Klassen je Triage-Kategorie (Fläche + Text). */
export const TRIAGE_SURFACE: Record<TriageKey, string> = {
  sk1: 'bg-triage-sk1 text-triage-sk1-foreground',
  sk2: 'bg-triage-sk2 text-triage-sk2-foreground',
  sk3: 'bg-triage-sk3 text-triage-sk3-foreground',
  sk4: 'bg-triage-sk4 text-triage-sk4-foreground',
  dead: 'bg-triage-dead text-triage-dead-foreground',
  unknown: 'bg-triage-unknown text-triage-unknown-foreground',
};

export const TRIAGE_LABEL: Record<TriageKey, string> = {
  sk1: 'SK I',
  sk2: 'SK II',
  sk3: 'SK III',
  sk4: 'SK IV',
  dead: 'Verstorben',
  unknown: 'Unbekannt',
};

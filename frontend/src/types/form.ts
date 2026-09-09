import type { Question } from './question';

/** Formular-Definition (Backend: Form mit verschachtelten Questions). */
export interface Form {
  scenarioId?: string | null;
  version?: string;
  id: number;
  name: string;
  note: string | null;
  description_form: string | null;
  show_patient_profile_search: boolean;
  questions: Question[];
}

/** Ein Zeitstempel-Eintrag (Frage oder Notiz): formatierte de-DE-Zeit + freie Notiz. */
export interface TimestampEntry {
  id: string;
  timestamp: string;
  note: string;
}

/**
 * Lokale Antwortdaten zu einem Formular (Source of Truth = Dexie).
 * Keys der Maps sind jeweils die Question-ID (als String).
 *
 * `responses` enthält Freitext-Antworten (Key = Question-ID) sowie
 * Checkbox-Zustände (Key = `${questionId}_${optionId}` -> boolean).
 */
export interface FormResponseDraft {
  scenarioId?: string | null;
  templateVersion?: string;
  formSnapshot?: Form;
  /** Besitzer-Konto (Beobachter) — sorgt fuer pro-Konto getrennte Entwuerfe. */
  owner?: string;
  formId: number;
  formName: string;
  responses: Record<string, unknown>;
  pickerSelections: Record<string, string>;
  scaleValues: Record<string, number>;
  timestamps: Record<string, TimestampEntry[]>;
  note: string;
  noteTimestamps: TimestampEntry[];
  /** Pro Frage: als "erledigt" markiert (Key = Question-ID). */
  completedQuestions: Record<string, boolean>;
  updatedAt: string;
}

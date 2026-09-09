import type { Vitalwerte } from './victimProfile';
import type { TimestampEntry } from './form';

/** Bild im Sende-Payload: base64-Data-URI + optionale Bezeichnung. */
export interface ImagePayload {
  uri: string;
  name: string;
}

/**
 * Struktur von POST /api/send-all-data/.
 * MUSS exakt dem vom Backend erwarteten Format entsprechen.
 */

export interface ObserverAccountPayload {
  first_name: string;
  last_name: string;
  email: string;
}

export interface FormResponsePayload {
  scenarioId?: string | null;
  templateVersion?: string;
  formId: number;
  formName: string;
  responses: Record<string, unknown>;
  pickerSelections: Record<string, string>;
  scaleValues: Record<string, number>;
  timestamps: Record<string, TimestampEntry[]>;
  note: string;
  noteTimestamps: TimestampEntry[];
  /** Bild-Map (Question-ID -> Bilder); ohne Bilder ein leeres Objekt. */
  images: Record<string, ImagePayload[]>;
}

/** Tabellenzeile im Payload: id/locked werden vor dem Senden entfernt. */
export type PayloadRow = Record<string, unknown>;

export interface VictimProfilePayload {
  scenarioId?: string | null;
  templateVersion?: string;
  assignmentId?: number;
  buttonNumber: string;
  profileId: number | null;
  khIntern: string;
  istSichtung: string;
  sichtungData: PayloadRow[];
  diagnostikData: PayloadRow[];
  therapieData: PayloadRow[];
  opTeam: PayloadRow[];
  verlaufseintraege: PayloadRow[];
  sollSichtung: string;
  diagnosticLoaded: {
    diagnose: string;
    blickdiagnose: string;
    befund: string;
    symptome: string;
  };
  vitalwerte: Vitalwerte;
}

export interface SendAllDataPayload {
  accountId?: string;
  observerAccount: ObserverAccountPayload;
  formResponses: FormResponsePayload[];
  victimProfiles: VictimProfilePayload[];
}

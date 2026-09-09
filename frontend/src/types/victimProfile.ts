/**
 * Vollständiges Patientenprofil (Backend: VictimProfile, Serializer `__all__`).
 * Alle Felder sind optional/nullable, da das Backend sie als blank/null zulässt.
 */
export interface VictimProfile {
  id: number;
  profile_number: string | null;
  category: string | null;
  pcz_ivena: string | null;
  expected_med_action: string | null;
  diagnosis: string | null;
  visual_diagnosis: string | null;
  findings: string | null;
  symptoms: string | null;
  actor_hints: string | null;
  required_specialty: string | null;
  gcs: string | null;
  spo2: string | null;
  rekap: string | null;
  resp_rate: string | null;
  sys_rr: string | null;
  ekg_monitor: string | null;
  ro_thorax: string | null;
  fast_sono: string | null;
  e_fast: string | null;
  radiology_finds: string | null;
  hb_value: string | null;
  blood_units: string | null;
  red_treatment_area: string | null;
  ventilation_place: string | null;
  icu_place: string | null;
  emergency_op: string | null;
  op_sieve_special: string | null;
  op_sieve_basic: string | null;
  personal_resources: string | null;
  anesthesia_team: string | null;
  radiology_resources: string | null;
  op_achi_res: string | null;
  op_uchi_res: string | null;
  op_nchi_res: string | null;
  medications: string | null;
  pre_treatment_rd: string | null;
  spare_col1: string | null;
  spare_col2: string | null;
  scenario_field: string | null;
  comment: string | null;
  lastname: string | null;
  firstname: string | null;
  birthdate: string | null;
}

/** Kurzform (Backend: VictimProfileShortSerializer), eingebettet in ScenarioVictim. */
export interface VictimProfileShort {
  id: number;
  profile_number: string | null;
  category: string | null;
  diagnosis: string | null;
  gcs: string | null;
  spo2: string | null;
  lastname: string | null;
  firstname: string | null;
}

/**
 * Zeile in einer Behandlungstabelle (Sichtung/Diagnostik/Therapie).
 * Tabellen-Lock liegt auf Tabellenebene, nicht pro Zeile.
 */
export interface TreatmentRow {
  id: string;
  place: string;
  verletztenkatalog: string;
  tatsaechlicheBehandlung: string;
  von: string;
  bis: string;
}

/** Zeile im OP-Team (pro Zeile bestätigbar/löschbar). */
export interface OpTeamRow {
  id: string;
  name: string;
  fach: string;
  start: string;
  dauer: string;
  locked: boolean;
}

/** Zeile in den Verlaufseinträgen (pro Zeile bestätigbar/löschbar). */
export interface VerlaufRow {
  id: string;
  uhrzeit: string;
  khBereich: string;
  beobachtungen: string;
  locked: boolean;
}

export interface Vitalwerte {
  gcs: string;
  spo2: string;
  rekap: string;
  sysRr: string;
  ekg: string;
  af: string;
  hb: string;
}

/** Diagnostische SOLL-Angaben (read-only, aus dem geladenen Profil). */
export interface DiagnosticLoaded {
  diagnose: string;
  blickdiagnose: string;
  befund: string;
  symptome: string;
}

/** Lokale Bearbeitung eines Profils während der Übung (Source of Truth = Dexie). */
export interface ProfileEditDraft {
  scenarioId?: string | null;
  templateVersion?: string;
  assignmentId?: number;
  profileSnapshot?: VictimProfile | VictimProfileShort;
  /** Besitzer-Konto (Beobachter) — sorgt fuer pro-Konto getrennte Entwuerfe. */
  owner?: string;
  buttonNumber: string;
  /** Formatierte Anzeige-Nummer (z. B. "J03"). */
  displayButtonNumber: string;
  profileId: number | null;
  observerName: string;
  khIntern: string;
  khNumLocked: boolean;
  istSichtung: string;
  istSichtungLocked: boolean;
  sollSichtung: string;
  sichtungData: TreatmentRow[];
  sichtungLocked: boolean;
  diagnostikData: TreatmentRow[];
  diagnostikLocked: boolean;
  therapieData: TreatmentRow[];
  therapieLocked: boolean;
  opTeam: OpTeamRow[];
  verlaufseintraege: VerlaufRow[];
  diagnosticLoaded: DiagnosticLoaded;
  vitalwerte: Vitalwerte;
  updatedAt: string;
}

/**
 * profileData.ts — Daten-Initialisierung & Transformationen für Patientenprofile.
 *
 * Sichtungs-, Diagnostik- und Therapie-Tabellen werden aus dem Profil
 * abgeleitet; die IST-Sichtung steuert die Verletztenkatalog-Spalte der
 * Sichtungstabelle.
 */

import type {
  DiagnosticLoaded,
  OpTeamRow,
  ProfileEditDraft,
  TreatmentRow,
  VerlaufRow,
  VictimProfile,
  VictimProfileShort,
  Vitalwerte,
} from '../../types';

/** Maximale Anzahl Zeilen in OP-Team- und Verlaufstabellen. */
export const MAX_ENTRIES = 10;

/** Auswählbare IST-Sichtungskategorien. */
export const SICHTUNG_OPTIONS = ['SK I', 'SK II', 'SK III'] as const;

/** Profilquelle: vollständig (online) oder Kurzform (eingebettet im Szenario). */
export type ProfileSource = VictimProfile | VictimProfileShort;

/** Loser Zugriff auf optionale Vollprofil-Felder (auf Kurzform undefined). */
const field = (p: ProfileSource, key: keyof VictimProfile): string =>
  ((p as Partial<VictimProfile>)[key] as string | null | undefined) ?? '';

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ============================================
// TABELLEN-INITIALISIERUNG
// ============================================

export const createSichtungData = (): TreatmentRow[] => [
  { id: 's1', place: 'Grün', verletztenkatalog: 'Nein', tatsaechlicheBehandlung: '', von: '', bis: '' },
  { id: 's2', place: 'Gelb', verletztenkatalog: 'Nein', tatsaechlicheBehandlung: '', von: '', bis: '' },
  { id: 's3', place: 'Rot', verletztenkatalog: 'Nein', tatsaechlicheBehandlung: '', von: '', bis: '' },
  { id: 's4', place: 'Schockraum', verletztenkatalog: 'Nein', tatsaechlicheBehandlung: '', von: '', bis: '' },
];

export const createDiagnostikData = (profile: ProfileSource): TreatmentRow[] => [
  { id: 'd1', place: 'EKG Monitoring', verletztenkatalog: field(profile, 'ekg_monitor'), tatsaechlicheBehandlung: '', von: '', bis: '' },
  { id: 'd2', place: 'Rö-Thorax', verletztenkatalog: field(profile, 'ro_thorax'), tatsaechlicheBehandlung: '', von: '', bis: '' },
  { id: 'd3', place: 'Fast-Sono', verletztenkatalog: field(profile, 'fast_sono'), tatsaechlicheBehandlung: '', von: '', bis: '' },
  { id: 'd4', place: 'E-Fast', verletztenkatalog: field(profile, 'e_fast'), tatsaechlicheBehandlung: '', von: '', bis: '' },
  { id: 'd5', place: 'CT', verletztenkatalog: field(profile, 'radiology_finds'), tatsaechlicheBehandlung: '', von: '', bis: '' },
];

export const createTherapieData = (profile: ProfileSource): TreatmentRow[] => {
  const opAchri = field(profile, 'op_achi_res');
  const opUchi = field(profile, 'op_uchi_res');
  const opNchi = field(profile, 'op_nchi_res');

  const opValues = [
    opAchri.trim().toUpperCase() === 'N' ? '' : opAchri,
    opUchi.trim().toUpperCase() === 'N' ? '' : opUchi,
    opNchi.trim().toUpperCase() === 'N' ? '' : opNchi,
  ].filter((val) => val && val.trim() !== '');

  const opVerletztenkatalog = opValues.join(' / ');

  const itsPlatz = field(profile, 'icu_place').trim().toUpperCase();
  const beatmung = field(profile, 'ventilation_place').trim().toUpperCase();

  let itsMitBeatmung = '';
  let itsOhneBeatmung = '';

  if (itsPlatz !== 'N') {
    if (beatmung === 'J') itsMitBeatmung = 'Ja';
    else if (beatmung === 'N') itsOhneBeatmung = 'Ja';
    else itsMitBeatmung = beatmung;
  }

  return [
    { id: 't1', place: 'Not-OP', verletztenkatalog: field(profile, 'emergency_op'), tatsaechlicheBehandlung: '', von: '', bis: '' },
    { id: 't2', place: 'OP', verletztenkatalog: opVerletztenkatalog, tatsaechlicheBehandlung: '', von: '', bis: '' },
    { id: 't3', place: 'Aufwachraum', verletztenkatalog: '', tatsaechlicheBehandlung: '', von: '', bis: '' },
    { id: 't4', place: 'Pacu', verletztenkatalog: '', tatsaechlicheBehandlung: '', von: '', bis: '' },
    { id: 't5', place: 'ITS mit Beatmung', verletztenkatalog: itsMitBeatmung, tatsaechlicheBehandlung: '', von: '', bis: '' },
    { id: 't6', place: 'ITS ohne Beatmung', verletztenkatalog: itsOhneBeatmung, tatsaechlicheBehandlung: '', von: '', bis: '' },
    { id: 't7', place: 'Normalstation', verletztenkatalog: '', tatsaechlicheBehandlung: '', von: '', bis: '' },
  ];
};

/** Aktualisiert die Verletztenkatalog-Spalte der Sichtungstabelle anhand der IST-Sichtung. */
export const updateSichtungDataByCategory = (
  rows: TreatmentRow[],
  istSichtung: string,
  profile: ProfileSource | null,
): TreatmentRow[] =>
  rows.map((row) => {
    if (row.place === 'Grün') return { ...row, verletztenkatalog: istSichtung === 'SK III' ? 'Ja' : 'Nein' };
    if (row.place === 'Gelb') return { ...row, verletztenkatalog: istSichtung === 'SK II' ? 'Ja' : 'Nein' };
    if (row.place === 'Rot') return { ...row, verletztenkatalog: istSichtung === 'SK I' ? 'Ja' : 'Nein' };
    if (row.place === 'Schockraum') {
      if (istSichtung === 'SK I') {
        return { ...row, verletztenkatalog: field(profile ?? ({} as ProfileSource), 'personal_resources') === '1' ? 'Ja' : 'Nein' };
      }
      return { ...row, verletztenkatalog: 'Nein' };
    }
    return row;
  });

// ============================================
// PROFIL-EXTRAKTION
// ============================================

export const extractDiagnosticLoaded = (profile: ProfileSource): DiagnosticLoaded => ({
  diagnose: field(profile, 'diagnosis'),
  blickdiagnose: field(profile, 'visual_diagnosis'),
  befund: field(profile, 'findings'),
  symptome: field(profile, 'symptoms'),
});

export const extractVitalwerte = (profile: ProfileSource): Vitalwerte => ({
  gcs: field(profile, 'gcs'),
  spo2: field(profile, 'spo2'),
  rekap: field(profile, 'rekap'),
  sysRr: field(profile, 'sys_rr'),
  ekg: field(profile, 'ekg_monitor'),
  af: field(profile, 'resp_rate'),
  hb: field(profile, 'hb_value'),
});

/** Formatiert die Button-Nummer für die Anzeige. */
export const formatButtonNumber = (displayButtonNumber: string, buttonNumber: string): string => {
  if (displayButtonNumber && displayButtonNumber.length > 0) return displayButtonNumber;
  if (buttonNumber && buttonNumber.length < 3) return `J${buttonNumber.padStart(2, '0')}`;
  return buttonNumber || '';
};

// ============================================
// ============================================

export const emptyOpTeamRow = (): OpTeamRow => ({
  id: uid(),
  name: '',
  fach: '',
  start: '',
  dauer: '',
  locked: false,
});

export const emptyVerlaufRow = (): VerlaufRow => ({
  id: uid(),
  uhrzeit: '',
  khBereich: '',
  beobachtungen: '',
  locked: false,
});

// ============================================
// INITIALER ENTWURF
// ============================================

interface BuildDraftArgs {
  buttonNumber: string;
  displayButtonNumber: string;
  profileId: number | null;
  observerName: string;
  profile: ProfileSource;
  istSichtung?: string;
}

/** Baut einen frischen Entwurf aus einem geladenen Profil (ohne lokale Edits). */
export const buildInitialDraft = ({
  buttonNumber,
  displayButtonNumber,
  profileId,
  observerName,
  profile,
  istSichtung = 'SK I',
}: BuildDraftArgs): ProfileEditDraft => {
  const sichtungData = updateSichtungDataByCategory(createSichtungData(), istSichtung, profile);
  return {
    buttonNumber,
    displayButtonNumber,
    profileId,
    observerName,
    khIntern: '',
    khNumLocked: false,
    istSichtung,
    istSichtungLocked: false,
    sollSichtung: field(profile, 'category'),
    sichtungData,
    sichtungLocked: false,
    diagnostikData: createDiagnostikData(profile),
    diagnostikLocked: false,
    therapieData: createTherapieData(profile),
    therapieLocked: false,
    opTeam: [],
    verlaufseintraege: [],
    diagnosticLoaded: extractDiagnosticLoaded(profile),
    vitalwerte: extractVitalwerte(profile),
    updatedAt: new Date().toISOString(),
  };
};

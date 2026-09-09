import { downloadMedia } from './media.service';
/**
 * observerData.service.ts — Nachbearbeitung bereits gesendeter Daten in der PWA.
 *
 * Lädt für den online angemeldeten Beobachter die bereits abgegebenen Daten
 * vom Server (`GET /api/observer/my-data/`) und spiegelt sie als bearbeitbare
 * Dexie-Entwürfe (formDrafts, profileDrafts). Außerdem werden Formulare und
 * Szenario-Opfer geladen, damit die Editoren ihre Vorlagen haben.
 */

import { authedGet, currentOwner } from './http';
import { API_ENDPOINTS } from '../config/constants';
import { db } from '../lib/db';
import {
  buildInitialDraft,
  emptyOpTeamRow,
  emptyVerlaufRow,
  formatButtonNumber,
} from '../features/profiles/profileData';
import type {
  Form,
  ScenarioVictim,
  FormResponseDraft,
  ProfileEditDraft,
  TreatmentRow,
  OpTeamRow,
  VerlaufRow,
  TimestampEntry,
} from '../types';

interface ServerFormResponse {
  scenario_uuid?: string;
  template_version?: string;
  template_snapshot?: Form;

  images?: Array<{ questionId: string; name: string; url: string }>;
  form: number;
  responses: Record<string, unknown> | null;
  picker_selections: Record<string, string> | null;
  scale_values: Record<string, number> | null;
  timestamps: Record<string, TimestampEntry[]> | null;
  note: string | null;
  note_timestamps: TimestampEntry[] | null;
}

interface ServerProfileResponse {
  scenario_uuid?: string;
  template_version?: string;
  template_snapshot?: { id: number; profileId: number; profile: import('../types').VictimProfile };

  button_number: string;
  kh_intern: string | null;
  soll_sichtung: string | null;
  ist_sichtung: string | null;
  diagnostic_loaded: Record<string, string> | null;
  vitalwerte: Record<string, string> | null;
  sichtung_data: Partial<TreatmentRow>[] | null;
  diagnostik_data: Partial<TreatmentRow>[] | null;
  therapie_data: Partial<TreatmentRow>[] | null;
  op_team: Partial<OpTeamRow>[] | null;
  verlauf: Partial<VerlaufRow>[] | null;
}

interface MyDataResponse {
  data_revision: number;
  observer_email: string;
  form_responses: ServerFormResponse[];
  victim_profile_responses: ServerProfileResponse[];
}

/** Überlagert die Basistabelle (mit ids/places) mit gespeicherten Serverwerten je `place`. */
function mergeTreatmentRows(base: TreatmentRow[], saved?: Partial<TreatmentRow>[] | null): TreatmentRow[] {
  if (!saved || saved.length === 0) return base;
  return base.map((row) => {
    const match = saved.find((s) => s.place === row.place);
    if (!match) return row;
    return {
      ...row,
      verletztenkatalog: match.verletztenkatalog ?? row.verletztenkatalog,
      tatsaechlicheBehandlung: match.tatsaechlicheBehandlung ?? '',
      von: match.von ?? '',
      bis: match.bis ?? '',
    };
  });
}

export const observerDataService = {
  /**
   * Holt Formulare + Szenario-Opfer und die eigenen abgegebenen Daten und
   * speichert sie in Dexie. Vorhandene lokale Entwürfe verhindern den Download.
   */
  async loadMyData(observerName: string): Promise<{ forms: number; profiles: number }> {
    const owner = currentOwner();
    const store = db;
    if (await store.formDrafts.count() || await store.profileDrafts.count() || await store.images.count() || await store.appMeta.get('pendingSubmission')) {
      throw new Error('Bitte zuerst lokale Änderungen senden. Der Download würde Entwürfe ersetzen.');
    }
    const [forms, victims, myData] = await Promise.all([
      authedGet<Form[]>(API_ENDPOINTS.FORMS),
      authedGet<ScenarioVictim[]>(API_ENDPOINTS.TEST_SCENARIO_VICTIMS),
      authedGet<MyDataResponse>(API_ENDPOINTS.OBSERVER_MY_DATA),
    ]);

    // Formularnamen für die Draft-Anzeige nachschlagen.
    const formNameById = new Map(forms.map((f) => [f.id, f.name]));
    const victimByButton = new Map(
      victims.filter((v) => v.button_number).map((v) => [v.button_number as string, v]),
    );

    const formDrafts: FormResponseDraft[] = myData.form_responses.map((fr) => ({
      owner,
      scenarioId: fr.scenario_uuid, templateVersion: fr.template_version,
      formSnapshot: fr.template_snapshot?.id ? fr.template_snapshot : forms.find(form => form.id === fr.form),
      formId: fr.form,
      formName: formNameById.get(fr.form) ?? `Formular ${fr.form}`,
      responses: fr.responses ?? {},
      pickerSelections: fr.picker_selections ?? {},
      scaleValues: fr.scale_values ?? {},
      timestamps: fr.timestamps ?? {},
      note: fr.note ?? '',
      noteTimestamps: fr.note_timestamps ?? [],
      completedQuestions: {},
      updatedAt: new Date().toISOString(),
    }));

    const profileDrafts: ProfileEditDraft[] = myData.victim_profile_responses.map((pr) => {
      const victim = victimByButton.get(pr.button_number);
      const profile = pr.template_snapshot?.profile ?? victim?.victim_profile_data ?? null;
      // Basis-Entwurf aus dem Szenario-Profil (liefert ids/places + SOLL-Werte).
      const base = profile
        ? buildInitialDraft({
            buttonNumber: pr.button_number,
            displayButtonNumber: formatButtonNumber('', pr.button_number),
            profileId: profile.id,
            observerName,
            profile,
            istSichtung: pr.ist_sichtung || 'SK I',
          })
        : null;

      const opTeam: OpTeamRow[] = (pr.op_team ?? []).map((r) => ({
        ...emptyOpTeamRow(),
        name: r.name ?? '',
        fach: r.fach ?? '',
        start: r.start ?? '',
        dauer: r.dauer ?? '',
      }));
      const verlauf: VerlaufRow[] = (pr.verlauf ?? []).map((r) => ({
        ...emptyVerlaufRow(),
        uhrzeit: r.uhrzeit ?? '',
        khBereich: r.khBereich ?? '',
        beobachtungen: r.beobachtungen ?? '',
      }));

      if (base) {
        return {
          ...base,
          scenarioId: pr.scenario_uuid, templateVersion: pr.template_version,
          assignmentId: pr.template_snapshot?.id, profileSnapshot: profile ?? undefined,
          owner,
          khIntern: pr.kh_intern ?? '',
          istSichtung: pr.ist_sichtung || base.istSichtung,
          sollSichtung: pr.soll_sichtung || base.sollSichtung,
          sichtungData: mergeTreatmentRows(base.sichtungData, pr.sichtung_data),
          diagnostikData: mergeTreatmentRows(base.diagnostikData, pr.diagnostik_data),
          therapieData: mergeTreatmentRows(base.therapieData, pr.therapie_data),
          opTeam,
          verlaufseintraege: verlauf,
          diagnosticLoaded: {
            diagnose: pr.diagnostic_loaded?.diagnose ?? base.diagnosticLoaded.diagnose,
            blickdiagnose: pr.diagnostic_loaded?.blickdiagnose ?? base.diagnosticLoaded.blickdiagnose,
            befund: pr.diagnostic_loaded?.befund ?? base.diagnosticLoaded.befund,
            symptome: pr.diagnostic_loaded?.symptome ?? base.diagnosticLoaded.symptome,
          },
          vitalwerte: { ...base.vitalwerte, ...pr.vitalwerte,
            sysRr: pr.vitalwerte?.sysRr ?? pr.vitalwerte?.sys_rr ?? base.vitalwerte.sysRr },
          updatedAt: new Date().toISOString(),
        };
      }

      // Fallback ohne Szenario-Profil: Entwurf rein aus dem Serverstand.
      const withIds = (rows?: Partial<TreatmentRow>[] | null): TreatmentRow[] =>
        (rows ?? []).map((r, i) => ({
          id: `srv-${i}`,
          place: r.place ?? '',
          verletztenkatalog: r.verletztenkatalog ?? '',
          tatsaechlicheBehandlung: r.tatsaechlicheBehandlung ?? '',
          von: r.von ?? '',
          bis: r.bis ?? '',
        }));
      return {
        owner,
        scenarioId: pr.scenario_uuid, templateVersion: pr.template_version,
        assignmentId: pr.template_snapshot?.id,
        buttonNumber: pr.button_number,
        displayButtonNumber: formatButtonNumber('', pr.button_number),
        profileId: null,
        observerName,
        khIntern: pr.kh_intern ?? '',
        khNumLocked: false,
        istSichtung: pr.ist_sichtung || 'SK I',
        istSichtungLocked: false,
        sollSichtung: pr.soll_sichtung ?? '',
        sichtungData: withIds(pr.sichtung_data),
        sichtungLocked: false,
        diagnostikData: withIds(pr.diagnostik_data),
        diagnostikLocked: false,
        therapieData: withIds(pr.therapie_data),
        therapieLocked: false,
        opTeam,
        verlaufseintraege: verlauf,
        diagnosticLoaded: {
          diagnose: pr.diagnostic_loaded?.diagnose ?? '',
          blickdiagnose: pr.diagnostic_loaded?.blickdiagnose ?? '',
          befund: pr.diagnostic_loaded?.befund ?? '',
          symptome: pr.diagnostic_loaded?.symptome ?? '',
        },
        vitalwerte: {
          gcs: pr.vitalwerte?.gcs ?? '',
          spo2: pr.vitalwerte?.spo2 ?? '',
          rekap: pr.vitalwerte?.rekap ?? '',
          sysRr: pr.vitalwerte?.sysRr ?? pr.vitalwerte?.sys_rr ?? '',
          ekg: pr.vitalwerte?.ekg ?? '',
          af: pr.vitalwerte?.af ?? '',
          hb: pr.vitalwerte?.hb ?? '',
        },
        updatedAt: new Date().toISOString(),
      } satisfies ProfileEditDraft;
    });

    const images = (await Promise.all(myData.form_responses.map(async response =>
      Promise.all((response.images ?? []).map(async image => ({
        id: crypto.randomUUID(), owner, formId: response.form, questionId: Number(image.questionId),
        name: image.name, blob: await downloadMedia(image.url), createdAt: new Date().toISOString(),
      }))),
    ))).flat();
    await db.transaction(
      'rw',
      [db.forms, db.scenarioVictims, db.formDrafts, db.profileDrafts, db.images, db.appMeta],
      async () => {
        if (store !== db || await db.formDrafts.count() || await db.profileDrafts.count() || await db.images.count() || await db.appMeta.get('pendingSubmission')) {
          throw new Error('Lokale Daten haben sich geändert. Bitte erneut versuchen.');
        }
        await Promise.all([
          db.forms.clear(),
          db.scenarioVictims.clear(),
          // Nur die Entwuerfe/Bilder DIESES Beobachters ersetzen.
          db.formDrafts.where('owner').equals(owner).delete(),
          db.profileDrafts.where('owner').equals(owner).delete(),
          db.images.where('owner').equals(owner).delete(),
        ]);
        await db.appMeta.put({ key: 'dataRevision', value: myData.data_revision });
        await db.forms.bulkPut(forms);
        await db.scenarioVictims.bulkPut(victims);
        if (images.length) await db.images.bulkPut(images);
        if (formDrafts.length) await db.formDrafts.bulkPut(formDrafts);
        if (profileDrafts.length) await db.profileDrafts.bulkPut(profileDrafts);
      },
    );

    return { forms: formDrafts.length, profiles: profileDrafts.length };
  },
};

import { flushDrafts } from '../lib/draftSaves';
import { db, type StoredImage } from '../lib/db';
import { authedGet, authedPost } from './http';
import { ApiError } from '../lib/apiClient';
import { API_ENDPOINTS } from '../config/constants';
import { formResponsesRepo } from './repos/formResponses.repo';
import { profileEditsRepo } from './repos/profileEdits.repo';
import { imagesRepo } from './repos/images.repo';
import { blobToDataUrl, compressImage } from '../utils/image';
import type {
  FormResponsePayload,
  ImagePayload,
  SendAllDataPayload,
  VictimProfilePayload,
  PayloadRow,
  Session,
  ProfileEditDraft,
} from '../types';

/** Entfernt id/locked aus Tabellenzeilen (Backend erwartet reine Datenfelder). */
function cleanupRows<T extends { id: string }>(rows: T[]): PayloadRow[] {
  return rows.map((row) => {
    const rest: Record<string, unknown> = { ...row };
    delete rest.id;
    delete rest.locked;
    return rest;
  });
}

/** Baut die Bild-Map (Question-ID -> Bilder als base64-Data-URI) für ein Formular. */
async function buildImageMap(formId: number, snapshot?: StoredImage[]): Promise<Record<string, ImagePayload[]>> {
  const images = snapshot ? snapshot.filter(image => image.formId === formId) : await imagesRepo.forForm(formId);
  const map: Record<string, ImagePayload[]> = {};
  for (const img of images) {
    const key = String(img.questionId);
    const blob = img.blob.size > 2 * 1024 * 1024 ? await compressImage(img.blob) : img.blob;
    const uri = await blobToDataUrl(blob);
    (map[key] ??= []).push({ uri, name: img.name });
  }
  return map;
}

function buildObserverAccount(session: Session) {
  return {
    first_name: session.firstName || session.username || 'Beobachter',
    last_name: session.lastName || '',
    email: session.email || '',
  };
}

function toProfilePayload(d: ProfileEditDraft): VictimProfilePayload {
  return {
    scenarioId: d.scenarioId, templateVersion: d.templateVersion, assignmentId: d.assignmentId,
    buttonNumber: d.buttonNumber,
    profileId: d.profileId,
    khIntern: d.khIntern || '',
    istSichtung: d.istSichtung || '',
    sichtungData: cleanupRows(d.sichtungData),
    diagnostikData: cleanupRows(d.diagnostikData),
    therapieData: cleanupRows(d.therapieData),
    opTeam: cleanupRows(d.opTeam),
    verlaufseintraege: cleanupRows(d.verlaufseintraege),
    sollSichtung: d.sollSichtung || '',
    diagnosticLoaded: {
      diagnose: d.diagnosticLoaded.diagnose || '',
      blickdiagnose: d.diagnosticLoaded.blickdiagnose || '',
      befund: d.diagnosticLoaded.befund || '',
      symptome: d.diagnosticLoaded.symptome || '',
    },
    vitalwerte: { ...d.vitalwerte },
  };
}

export interface SyncSummary {
  forms: number;
  profiles: number;
}

interface PendingSubmission {
  payload: SendAllDataPayload & { requestId: string; expectedRevision: number };
  forms: Awaited<ReturnType<typeof formResponsesRepo.all>>;
  profiles: Awaited<ReturnType<typeof profileEditsRepo.all>>;
  images: StoredImage[];
}

export const syncService = {
  /** Liest Dexie und baut die vollständige send-all-data-Payload. */
  async assembleSendPayload(session: Session, snapshot?: {
    forms: Awaited<ReturnType<typeof formResponsesRepo.all>>;
    profiles: Awaited<ReturnType<typeof profileEditsRepo.all>>;
    images: StoredImage[];
  }): Promise<SendAllDataPayload> {
    const [formDrafts, profileDrafts] = snapshot ? [snapshot.forms, snapshot.profiles] : await Promise.all([
      formResponsesRepo.all(),
      profileEditsRepo.all(),
    ]);

    const formResponses: FormResponsePayload[] = [];
    for (const draft of formDrafts) {
      formResponses.push({
        scenarioId: draft.scenarioId, templateVersion: draft.templateVersion,
        formId: draft.formId,
        formName: draft.formName,
        responses: draft.responses,
        pickerSelections: draft.pickerSelections,
        scaleValues: draft.scaleValues,
        timestamps: draft.timestamps,
        note: draft.note || '',
        noteTimestamps: draft.noteTimestamps,
        images: await buildImageMap(draft.formId, snapshot?.images),
      });
    }

    const victimProfiles = profileDrafts.map(toProfilePayload);

    return {
      accountId: session.accountId,
      observerAccount: buildObserverAccount(session),
      formResponses,
      victimProfiles,
    };
  },

  /** Send bounded, retryable snapshots; retain edits made while a request is in flight. */
  async sendAllData(session: Session): Promise<SyncSummary> {
    await flushDrafts();
    return navigator.locks.request(`dueb-send:${db.name}`, () => this.sendLocked(session));
  },

  async exportLocalData(session: Session): Promise<void> {
    await flushDrafts();
    const store = db;
    const payload = await this.assembleSendPayload(session).catch(() => null);
    const backup = { format: 'dueb-app-local-v2', createdAt: new Date().toISOString(),
      server: session.serverUrl, username: session.username, accountId: session.accountId, payload,
      forms: await store.formDrafts.toArray(), profiles: await store.profileDrafts.toArray(),
      images: await Promise.all((await store.images.toArray()).map(async ({ blob, ...image }) =>
        ({ ...image, uri: await blobToDataUrl(blob) }))),
      pending: (await store.appMeta.get('pendingSubmission'))?.value,
      conflicts: (await store.appMeta.toArray()).filter(entry => entry.key.startsWith('conflictArchive:') || entry.key.startsWith('draftArchive:')) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `DUEB-App-Entwuerfe-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  async resolveConflict(): Promise<void> {
    const store = db;
    const server = await authedGet<{ data_revision: number }>(API_ENDPOINTS.OBSERVER_MY_DATA);
    if (store !== db) throw new Error('Das Konto wurde gewechselt.');
    await store.transaction('rw', store.appMeta, async () => {
      const pending = await store.appMeta.get('pendingSubmission');
      await store.appMeta.put({ key: `conflictArchive:${crypto.randomUUID()}`,
        value: { createdAt: new Date().toISOString(), server, pending: pending?.value } });
      await store.appMeta.put({ key: 'dataRevision', value: server.data_revision });
      await store.appMeta.delete('pendingSubmission');
    });
  },

  async sendLocked(session: Session): Promise<SyncSummary> {
    const store = db;
    const snapshot = await store.transaction('r', [store.formDrafts, store.profileDrafts, store.images], async () => ({
      forms: await store.formDrafts.toArray(), profiles: await store.profileDrafts.toArray(), images: await store.images.toArray(),
    }));
    const formIds = new Set(snapshot.forms.map(form => form.formId));
    if (snapshot.images.some(image => !formIds.has(image.formId))) {
      throw new Error('Es gibt Fotos ohne zugehörigen Entwurf. Bitte den lokalen Export sichern und die Entwürfe archivieren.');
    }
    const total = { forms: 0, profiles: 0 };
    let pending = (await store.appMeta.get('pendingSubmission'))?.value as PendingSubmission | undefined;
    while (pending || snapshot.forms.length || snapshot.profiles.length) {
      if (store !== db) throw new Error('Das Konto wurde gewechselt.');
      let submission = pending;
      if (!submission) {
        // A form carries at most 15 images of 2 MiB each (base64 stays below 50 MB).
        const forms = snapshot.forms.length ? [snapshot.forms[0]] : [];
        const profiles = forms.length ? [] : [snapshot.profiles[0]];
        const images = snapshot.images.filter(image => forms.some(form => form.formId === image.formId));
        submission = { forms, profiles, images,
          payload: { ...(await this.assembleSendPayload(session, { forms, profiles, images })),
            requestId: crypto.randomUUID(), expectedRevision: (await store.appMeta.get('dataRevision'))?.value as number ?? 0 } };
        const bytes = new Blob([JSON.stringify(submission.payload)]).size;
        if (bytes > 44 * 1024 * 1024) throw new Error('Ein einzelner Datensatz ist zu groß. Bitte lokal exportieren und die Bildgröße reduzieren.');
        await store.appMeta.put({ key: 'pendingSubmission', value: submission });
      }
      await this.sendSubmission(session, submission);
      total.forms += submission.forms.length;
      total.profiles += submission.profiles.length;
      snapshot.forms = snapshot.forms.filter(form => !submission.forms.some(sent => sent.formId === form.formId));
      snapshot.profiles = snapshot.profiles.filter(profile => !submission.profiles.some(sent => sent.buttonNumber === profile.buttonNumber));
      pending = undefined;
    }
    return total;
  },

  async sendSubmission(session: Session, submission: PendingSubmission): Promise<void> {
    const store = db;
    let response: { data_revision: number };
    try {
      response = await authedPost<{ data_revision: number }>(API_ENDPOINTS.SEND_ALL_DATA, submission.payload);
    } catch (error) {
      // Diese Antworten bestätigen die Ablehnung ohne Datenbankänderung.
      if (error instanceof ApiError && [400, 403, 413].includes(error.status)) {
        await store.appMeta.put({ key: `draftArchive:rejected:${crypto.randomUUID()}`, value: { payload: submission.payload } });
        await store.appMeta.delete('pendingSubmission');
      }
      throw error;
    }
    await store.transaction('rw', [store.appMeta, store.formDrafts, store.profileDrafts, store.images], async () => {
      for (const draft of submission.forms) {
        const key: [string, number] = [draft.owner ?? `${session.serverUrl}|${session.role}|${session.accountId ?? session.username}`, draft.formId];
        const current = await store.formDrafts.get(key);
        const currentImages = await store.images.where('[owner+formId]').equals(key).toArray();
        const oldImages = submission.images.filter(image => image.formId === draft.formId);
        const unchangedImages = currentImages.length === oldImages.length && currentImages.every(image =>
          oldImages.some(old => old.id === image.id && old.name === image.name));
        if (JSON.stringify(current) === JSON.stringify(draft) && unchangedImages) {
          await store.formDrafts.delete(key);
          for (const image of oldImages) await store.images.delete(image.id);
        }
      }
      for (const draft of submission.profiles) {
        const key: [string, string] = [draft.owner ?? `${session.serverUrl}|${session.role}|${session.accountId ?? session.username}`, draft.buttonNumber];
        if (JSON.stringify(await store.profileDrafts.get(key)) === JSON.stringify(draft)) {
          await store.profileDrafts.delete(key);
        }
      }
      await store.appMeta.put({ key: 'dataRevision', value: response.data_revision });
      await store.appMeta.delete('pendingSubmission');
    });
  },
};

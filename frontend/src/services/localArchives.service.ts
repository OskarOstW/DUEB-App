import Dexie from 'dexie';
import { db, type StoredImage } from '../lib/db';
import { flushDrafts } from '../lib/draftSaves';
import { blobToDataUrl } from '../utils/image';
import type { Session } from '../types';

function legacyName(session: Session) {
  return `dueb-app:${encodeURIComponent(session.serverUrl)}:${session.role}:${encodeURIComponent(session.username)}`;
}

async function readLegacy(session: Session) {
  if (!session.accountId || !(await Dexie.exists(legacyName(session)))) return null;
  // Open the old schema dynamically, without running historical destructive upgrades.
  const legacy = new Dexie(legacyName(session));
  try {
    await legacy.open();
    const rows = async (name: string) => legacy.tables.some(table => table.name === name) ? legacy.table(name).toArray() : [];
    return { forms: [...await rows('formDrafts'), ...await rows('formResponses')],
      profiles: [...await rows('profileDrafts'), ...await rows('profileEdits')], images: await rows('images') as StoredImage[] };
  } finally { legacy.close(); }
}

export async function legacyDraftCount(session: Session) {
  const data = await readLegacy(session);
  return data ? data.forms.length + data.profiles.length + data.images.length : 0;
}

export async function exportLegacyDrafts(session: Session) {
  const data = await readLegacy(session);
  if (!data) throw new Error('Keine frühere lokale Datenbank gefunden.');
  const images = await Promise.all(data.images.map(async ({ blob, ...image }) => ({ ...image, uri: await blobToDataUrl(blob) })));
  const url = URL.createObjectURL(new Blob([JSON.stringify({ format: 'dueb-app-legacy-archive-v1',
    server: session.serverUrl, username: session.username, ...data, images }, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `DUEB-Altdaten-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function archiveCurrentDrafts() {
  await flushDrafts();
  const store = db;
  await navigator.locks.request(`dueb-send:${store.name}`, async () => {
    const snapshot = await store.transaction('r', [store.formDrafts, store.profileDrafts, store.images], async () => ({
      forms: await store.formDrafts.toArray(), profiles: await store.profileDrafts.toArray(), images: await store.images.toArray(),
    }));
    const images = await Promise.all(snapshot.images.map(async ({ blob, ...image }) => ({ ...image, uri: await blobToDataUrl(blob) })));
    await store.transaction('rw', [store.appMeta, store.formDrafts, store.profileDrafts, store.images], async () => {
      if (store !== db || JSON.stringify(await store.formDrafts.toArray()) !== JSON.stringify(snapshot.forms)
        || JSON.stringify(await store.profileDrafts.toArray()) !== JSON.stringify(snapshot.profiles)
        || JSON.stringify(await store.images.toArray()) !== JSON.stringify(snapshot.images)) {
        throw new Error('Die lokalen Daten haben sich geändert. Bitte erneut versuchen.');
      }
      await store.appMeta.put({ key: `draftArchive:${crypto.randomUUID()}`, value: {
        createdAt: new Date().toISOString(), forms: snapshot.forms, profiles: snapshot.profiles, images,
        pending: (await store.appMeta.get('pendingSubmission'))?.value,
      } });
      await store.formDrafts.clear();
      await store.profileDrafts.clear();
      await store.images.clear();
      await store.appMeta.delete('pendingSubmission');
    });
  });
}

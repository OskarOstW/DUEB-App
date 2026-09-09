import { db, type DuebDatabase } from '../../lib/db';
import { currentOwner } from '../http';
import type { ProfileEditDraft } from '../../types';

/** Profil-Entwuerfe in Dexie — pro Beobachter (owner) getrennt. */
export const profileEditsRepo = {
  async get(buttonNumber: string): Promise<ProfileEditDraft | undefined> {
    return db.profileDrafts.get([currentOwner(), buttonNumber]);
  },
  async save(draft: ProfileEditDraft, store: DuebDatabase = db): Promise<void> {
    await store.profileDrafts.put({
      ...draft,
      owner: draft.owner ?? currentOwner(),
      updatedAt: new Date().toISOString(),
    });
  },
  async all(): Promise<ProfileEditDraft[]> {
    return db.profileDrafts.where('owner').equals(currentOwner()).toArray();
  },
  async count(): Promise<number> {
    return db.profileDrafts.where('owner').equals(currentOwner()).count();
  },
  async delete(buttonNumber: string): Promise<void> {
    await db.profileDrafts.delete([currentOwner(), buttonNumber]);
  },
  /** Loescht nur die Entwuerfe des aktuellen Beobachters. */
  async clear(): Promise<void> {
    await db.profileDrafts.where('owner').equals(currentOwner()).delete();
  },
};

import { db, type StoredImage } from '../../lib/db';
import { currentOwner } from '../http';
import { formResponsesRepo } from './formResponses.repo';
import type { FormResponseDraft } from '../../types';
import { MAX_IMAGES_PER_FORM } from '../../config/constants';

export class ImageLimitError extends Error {
  constructor() {
    super(`Maximal ${MAX_IMAGES_PER_FORM} Bilder pro Formular erlaubt.`);
    this.name = 'ImageLimitError';
  }
}

/** Formular-Bilder in Dexie — pro Beobachter (owner) getrennt. */
export const imagesRepo = {
  async add(formId: number, questionId: number, blob: Blob, name = '', draft?: FormResponseDraft): Promise<StoredImage> {
    const store = db;
    const owner = currentOwner();
    const response = draft ?? await formResponsesRepo.getOrCreate(formId, '');
    return store.transaction('rw', [store.images, store.formDrafts], async () => {
      const count = await store.images.where('[owner+formId]').equals([owner, formId]).count();
      if (count >= MAX_IMAGES_PER_FORM) throw new ImageLimitError();
      const image: StoredImage = {
        id: crypto.randomUUID(), owner, formId, questionId, blob, name,
        createdAt: new Date().toISOString(),
      };
      await store.formDrafts.put({ ...response, owner, updatedAt: new Date().toISOString() });
      await store.images.add(image);
      return image;
    });
  },
  async updateName(id: string, name: string): Promise<void> {
    await db.images.update(id, { name });
  },
  async forForm(formId: number): Promise<StoredImage[]> {
    return db.images.where('[owner+formId]').equals([currentOwner(), formId]).toArray();
  },
  async delete(id: string): Promise<void> {
    await db.images.delete(id);
  },
  /** Loescht nur die Bilder des aktuellen Beobachters. */
  async clear(): Promise<void> {
    await db.images.where('owner').equals(currentOwner()).delete();
  },
};

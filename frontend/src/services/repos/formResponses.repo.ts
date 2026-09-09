import { db, type DuebDatabase } from '../../lib/db';
import { currentOwner } from '../http';
import type { FormResponseDraft } from '../../types';

const emptyDraft = (formId: number, formName: string): FormResponseDraft => ({
  owner: currentOwner(),
  formId,
  formName,
  responses: {},
  pickerSelections: {},
  scaleValues: {},
  timestamps: {},
  note: '',
  noteTimestamps: [],
  completedQuestions: {},
  updatedAt: new Date().toISOString(),
});

/** Formular-Entwuerfe in Dexie — pro Beobachter (owner) getrennt. */
export const formResponsesRepo = {
  async get(formId: number): Promise<FormResponseDraft | undefined> {
    return db.formDrafts.get([currentOwner(), formId]);
  },
  async getOrCreate(formId: number, formName: string): Promise<FormResponseDraft> {
    const store = db;
    const saved = await store.formDrafts.get([currentOwner(), formId]);
    if (saved) return saved;
    const form = await store.forms.get(formId);
    return { ...emptyDraft(formId, formName), scenarioId: form?.scenarioId,
      templateVersion: form?.version, formSnapshot: form };
  },
  async save(draft: FormResponseDraft, store: DuebDatabase = db): Promise<void> {
    await store.formDrafts.put({ ...draft, owner: draft.owner ?? currentOwner(), updatedAt: new Date().toISOString() });
  },
  async all(): Promise<FormResponseDraft[]> {
    return db.formDrafts.where('owner').equals(currentOwner()).toArray();
  },
  async count(): Promise<number> {
    const owner = currentOwner();
    const store = db;
    const [drafts, images] = await Promise.all([
      store.formDrafts.where('owner').equals(owner).toArray(), store.images.where('owner').equals(owner).toArray(),
    ]);
    return new Set([...drafts.map(draft => draft.formId), ...images.map(image => image.formId)]).size;
  },
  /** Loescht nur die Entwuerfe des aktuellen Beobachters. */
  async clear(): Promise<void> {
    await db.formDrafts.where('owner').equals(currentOwner()).delete();
  },
};

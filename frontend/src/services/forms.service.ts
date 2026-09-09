import { apiRequest } from '../lib/apiClient';
import { currentToken } from './http';
import { authedGet, authedPost, authedDelete } from './http';
import { API_ENDPOINTS } from '../config/constants';
import { db } from '../lib/db';
import type { Form } from '../types';

/** Sende-Format für das Erstellen/Aktualisieren eines Formulars (Backend-Contract). */
export interface FormSavePayload {
  name: string;
  description_form: string;
  show_patient_profile_search: boolean;
  questions: Array<{
    id?: number;
    question_text: string;
    description_question: string;
    hint: string;
    option_type: string;
    input_field_added: boolean;
    image_upload_desired: boolean;
    options: Array<{ id?: number; label: string }>;
  }>;
}

export const formsService = {
  /** Lädt Formulare vom Server und spiegelt sie nach Dexie (Offline-Durability). */
  async fetchForms(): Promise<Form[]> {
    const store = db;
    const forms = await authedGet<Form[]>(API_ENDPOINTS.FORMS);
    await store.transaction('rw', store.forms, async () => {
      await store.forms.clear();
      await store.forms.bulkPut(forms);
    });
    return forms;
  },
  /** Liest den lokalen Snapshot (für Offline / initialData). */
  async cachedForms(): Promise<Form[]> {
    return db.forms.toArray();
  },
  async cachedForm(id: number): Promise<Form | undefined> {
    return db.forms.get(id);
  },
  /** Erstellt ein Formular am Server und aktualisiert den lokalen Snapshot. */
  async createForm(payload: FormSavePayload): Promise<Form> {
    const created = await authedPost<Form>(API_ENDPOINTS.FORMS, payload);
    await this.fetchForms();
    return created;
  },
  /** Löscht ein Formular am Server und aus dem lokalen Snapshot. */
  async deleteForm(id: number): Promise<void> {
    await authedDelete<void>(`${API_ENDPOINTS.FORMS}${id}/`);
    await db.forms.delete(id);
  },
  /** Ersetzt ein Formular vollständig (PUT) und aktualisiert den lokalen Snapshot. */
  async replaceForm(id: number, payload: FormSavePayload): Promise<Form> {
    const created = await apiRequest<Form>(`${API_ENDPOINTS.FORMS}${id}/`, { method: 'PUT', body: payload, token: currentToken() });
    await this.fetchForms();
    return created;
  },
};

/**
 * Dexie-Datenbank (IndexedDB) — lokaler Speicher der PWA.
 *
 * Drei Datenarten:
 *  - Server-Snapshots (nur lesend): forms, scenarioVictims, victimProfiles, contacts, galleryImages
 *  - Lokale Nutzerdaten (Source of Truth): formDrafts, profileDrafts, images
 *  - appMeta: Sitzung, Server-URL, Datenstand, letzte Gerätevorbereitung, offener Versand
 *
 * Pro Server + Rolle + Konto wird eine eigene Datenbank geöffnet (activateAccount),
 * damit sich mehrere Beobachter ein Gerät teilen können, ohne Daten zu vermischen.
 */

import Dexie, { type EntityTable, type Table } from 'dexie';
import type {
  Form,
  FormResponseDraft,
  ScenarioVictim,
  VictimProfile,
  ProfileEditDraft,
  Contact,
  GalleryImage,
} from '../types';

/** Generischer Key-Value-Eintrag für Session/Meta. */
export interface MetaEntry {
  key: string;
  value: unknown;
}

/** Gespeichertes Bild zu Formular+Frage (Blob spart ggü. base64 Platz). */
export interface StoredImage {
  id: string;
  /** Besitzer-Konto (Beobachter) — getrennte Bilder pro Konto. */
  owner: string;
  formId: number;
  questionId: number;
  blob: Blob;
  /** Vom Beobachter editierbare Bezeichnung (Default leer). */
  name: string;
  createdAt: string;
}

export class DuebDatabase extends Dexie {
  appMeta!: EntityTable<MetaEntry, 'key'>;
  forms!: EntityTable<Form, 'id'>;
  formDrafts!: Table<FormResponseDraft, [string, number]>;
  images!: EntityTable<StoredImage, 'id'>;
  scenarioVictims!: EntityTable<ScenarioVictim, 'id'>;
  victimProfiles!: EntityTable<VictimProfile, 'id'>;
  profileDrafts!: Table<ProfileEditDraft, [string, string]>;
  contacts!: EntityTable<Contact, 'id'>;
  galleryImages!: EntityTable<GalleryImage, 'id'>;

  constructor(name = 'dueb-app') {
    super(name);
    this.version(1).stores({
      appMeta: 'key',
      observerCredentials: 'username',
      forms: 'id, name',
      formResponses: 'formId, updatedAt',
      images: 'id, formId, [formId+questionId]',
      scenarioVictims: 'id, button_number',
      victimProfiles: 'id, profile_number',
      profileEdits: 'buttonNumber, updatedAt',
      contacts: 'id',
      galleryImages: 'id',
    });

    // v2: Entwuerfe pro Beobachter trennen (Owner-Scoping). Primary Keys lassen
    // sich in Dexie nicht aendern -> Entwurfs-Tabellen umbenennen, alte entfernen.
    this.version(2)
      .stores({
        formResponses: null,
        profileEdits: null,
        formDrafts: '[owner+formId], owner, formId, updatedAt',
        profileDrafts: '[owner+buttonNumber], owner, buttonNumber, updatedAt',
        images: 'id, owner, formId, [owner+formId], [owner+formId+questionId]',
      })
      .upgrade(async (tx) => {
        // Alte, nicht owner-getaggte Bilder einmalig verwerfen.
        await tx.table('images').clear();
      });

    // v3/v4: Der frühere Offline-Login entfällt — die Anmeldung erfolgt immer
    // online. Die Tabelle observerCredentials wird daher geleert und entfernt;
    // die Versionen bleiben stehen, damit bestehende Installationen migrieren.
    this.version(3).upgrade(async (tx) => {
      await tx.table('observerCredentials').clear();
    });
    this.version(4).stores({ observerCredentials: null });
  }
}

export const sessionDb = new DuebDatabase();
export let db = sessionDb;

export function activateAccount(server: string, username: string, role: string, accountId?: string): void {
  if (db !== sessionDb) db.close();
  db = new DuebDatabase(`dueb-app:${encodeURIComponent(server)}:${role}:${encodeURIComponent(accountId ? `id:${accountId}` : username)}`);
}


/** Schlüssel für appMeta-Einträge (typsicher zentralisiert). */
export const META_KEYS = {
  SESSION: 'session',
  SERVER_URL: 'serverUrl',
  LAST_EXERCISE_PREP: 'lastExercisePrep',
} as const;

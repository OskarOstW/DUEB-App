import { db, sessionDb, META_KEYS } from '../../lib/db';
import type { Session } from '../../types';

async function getMeta<T>(key: string): Promise<T | undefined> {
  const store = [META_KEYS.SESSION, META_KEYS.SERVER_URL].includes(key as typeof META_KEYS.SESSION) ? sessionDb : db;
  const entry = await store.appMeta.get(key);
  return entry?.value as T | undefined;
}

async function setMeta(key: string, value: unknown): Promise<void> {
  const store = [META_KEYS.SESSION, META_KEYS.SERVER_URL].includes(key as typeof META_KEYS.SESSION) ? sessionDb : db;
  await store.appMeta.put({ key, value });
}

export const metaRepo = {
  async getSession(): Promise<Session | null> {
    return (await getMeta<Session>(META_KEYS.SESSION)) ?? null;
  },
  async setSession(session: Session | null): Promise<void> {
    if (session) await setMeta(META_KEYS.SESSION, session);
    else await sessionDb.appMeta.delete(META_KEYS.SESSION);
  },
  async getServerUrl(): Promise<string> {
    return (await getMeta<string>(META_KEYS.SERVER_URL)) ?? '';
  },
  async setServerUrl(url: string): Promise<void> {
    await setMeta(META_KEYS.SERVER_URL, url);
  },
  async getLastExercisePrep(): Promise<string | null> {
    return (await getMeta<string>(META_KEYS.LAST_EXERCISE_PREP)) ?? null;
  },
  async setLastExercisePrep(iso: string): Promise<void> {
    await setMeta(META_KEYS.LAST_EXERCISE_PREP, iso);
  },
};

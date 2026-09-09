import { flushDrafts } from '../lib/draftSaves';
import { activateAccount } from '../lib/db';
import { queryClient } from '../lib/queryClient';
import { setBaseUrl } from '../config/env';
import { create } from 'zustand';
import type { Session } from '../types';
import { metaRepo } from '../services/repos/meta.repo';

interface SessionState {
  session: Session | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (session: Session) => Promise<void>;
  clearSession: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  hydrated: false,
  async hydrate() {
    let session = await metaRepo.getSession();
    if (session && (!session.serverUrl || !session.expiresAt || Date.parse(session.expiresAt) <= Date.now())) {
      session = null;
      await metaRepo.setSession(null);
    }
    if (session) {
      setBaseUrl(session.serverUrl);
      activateAccount(session.serverUrl, session.username, session.role, session.accountId);
    }
    if ('caches' in window) await caches.delete('api-get');
    set({ session, hydrated: true });
  },
  async setSession(session) {
    queryClient.clear();
    await metaRepo.setSession(session);
    set({ session });
  },
  async clearSession() {
    await flushDrafts();
    await queryClient.cancelQueries();
    queryClient.clear();
    await metaRepo.setSession(null);
    set({ session: null });
  },
}));

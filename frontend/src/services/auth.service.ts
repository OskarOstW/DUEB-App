import { apiRequest } from '../lib/apiClient';
import { normalizeBaseUrl, setBaseUrl } from '../config/env';
import { API_ENDPOINTS, ROLES } from '../config/constants';
import { activateAccount, db } from '../lib/db';
import { flushDrafts } from '../lib/draftSaves';
import { metaRepo } from './repos/meta.repo';
import type { Session } from '../types';

interface LoginResponse {
  account_id: string;
  token: string; username?: string; email?: string; first_name?: string; last_name?: string;
  allowed_forms?: number[]; show_patient_profiles?: boolean; expires_at: string; data_revision?: number;
}

async function login(username: string, password: string, url: string, admin: boolean): Promise<Session> {
  if (!navigator.onLine) throw new Error('Die Anmeldung erfordert eine Internetverbindung.');
  await flushDrafts();
  const serverUrl = normalizeBaseUrl(url || window.location.origin);
  setBaseUrl(serverUrl);
  const data = await apiRequest<LoginResponse>(admin ? API_ENDPOINTS.TOKEN_AUTH : API_ENDPOINTS.OBSERVER_LOGIN, {
    method: 'POST', body: { username, password },
  });
  const session: Session = {
    accountId: data.account_id, serverUrl, expiresAt: data.expires_at, role: admin ? ROLES.ADMIN : ROLES.OBSERVER,
    token: data.token, username: data.username ?? username, email: data.email ?? '',
    firstName: data.first_name ?? '', lastName: data.last_name ?? '',
    allowedForms: data.allowed_forms ?? [], showPatientProfiles: !!data.show_patient_profiles,
  };
  activateAccount(serverUrl, session.username, session.role, session.accountId);
  if (!(await db.appMeta.get('dataRevision')) ||
      (!(await db.formDrafts.count()) && !(await db.profileDrafts.count()) && !(await db.images.count()) && !(await db.appMeta.get('pendingSubmission')))) {
    await db.appMeta.put({ key: 'dataRevision', value: data.data_revision ?? 0 });
  }
  await metaRepo.setServerUrl(serverUrl);
  return session;
}

export const authService = {
  loginAsAdmin: (username: string, password: string, url: string) => login(username, password, url, true),
  loginAsObserver: (username: string, password: string, url = '') => login(username, password, url, false),
};

import type { Role } from '../config/constants';

/** Aktuell angemeldete Sitzung. token ist stets das verwendbare Auth-Token. */
export interface Session {
  accountId?: string;
  serverUrl: string;
  expiresAt: string;
  role: Role;
  token: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Nur Beobachter: IDs der zugaenglichen Formulare (leer = keine). */
  allowedForms?: number[];
  /** Nur Beobachter: darf Patientenprofile sehen. */
  showPatientProfiles?: boolean;
}

export interface TokenAuthResponse {
  token: string;
}

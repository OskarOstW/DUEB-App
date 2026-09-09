/**
 * Beobachter-Zugriffsregeln (pro Konto): nur freigegebene Formulare (allowed_forms)
 * und Patientenprofile nur bei show_patient_profiles. Admins sehen immer alles.
 */
import type { Session } from '../types';
import { ROLES } from '../config/constants';

/** True, wenn die Sitzung ein Beobachter (kein Admin) ist. */
export function isObserver(session: Session | null): boolean {
  return session?.role === ROLES.OBSERVER;
}

/** Admins sehen Profile immer; Beobachter nur, wenn ihr Konto es erlaubt. */
export function canSeeProfiles(session: Session | null): boolean {
  return !isObserver(session) || !!session?.showPatientProfiles;
}

/** Admins sehen jedes Formular; Beobachter nur die in allowed_forms freigegebenen. */
export function isFormAllowed(session: Session | null, formId: number): boolean {
  if (!isObserver(session)) return true;
  return (session?.allowedForms ?? []).includes(formId);
}

/** Zentrale, fachliche Konstanten. */

export const ROLES = {
  ADMIN: 'Admin',
  OBSERVER: 'Observer',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const TIMING = {
  API_TIMEOUT: 15_000,
  RETRY_DELAY: 1_000,
  MAX_RETRIES: 3,
  AUTO_SAVE_DEBOUNCE: 800,
} as const;

/** Maximale Anzahl Bilder pro Formular (gleiche Grenze prüft das Backend). */
export const MAX_IMAGES_PER_FORM = 15;

export const API_ENDPOINTS = {
  TOKEN_AUTH: '/api/api-token-auth/',
  OBSERVER_ACCOUNTS: '/api/observer-accounts/',
  FORMS: '/api/forms/',
  FORM_RESPONSES: '/api/form-responses/',
  VICTIM_PROFILES: '/api/victim-profiles/',
  TEST_SCENARIO_VICTIMS: '/api/test-scenario-victims/',
  VICTIM_PROFILE_RESPONSES: '/api/victim-profile-responses/',
  SEND_ALL_DATA: '/api/send-all-data/',
  CONTACTS: '/api/contacts/',
  GALLERY_IMAGES: '/api/images/',
  OBSERVER_LOGIN: '/api/observer/login/',
  OBSERVER_MY_DATA: '/api/observer/my-data/',
} as const;

/** App-interne Routen. */
export const ROUTES = {
  LOGIN: '/login',
  HOME: '/',
  FORMS: '/forms',
  FORM_FILL: '/forms/:formId',
  FORM_EDITOR: '/forms/:formId/edit',
  FORM_EDITOR_NEW: '/forms/new',
  PROFILES: '/profiles',
  PROFILE: '/profiles/:buttonNumber',
  CONTACTS: '/contacts',
  GALLERY: '/gallery',
} as const;

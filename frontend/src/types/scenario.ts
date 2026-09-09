import type { VictimProfile } from './victimProfile';

/** Zuordnung eines Profils zu einem Szenario (Backend: TestScenarioVictim). */
export interface ScenarioVictim {
  scenarioId?: string | null;
  version?: string;
  id: number;
  scenario: number;
  victim_profile: number | null;
  victim_profile_data: VictimProfile | null;
  organization: number | null;
  sequential_number: number | null;
  button_number: string | null;
}

export interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  general_info: string;
}

export interface GalleryImage {
  id: number;
  image_url: string | null;
  description: string;
}

import { authedGet } from './http';
import { API_ENDPOINTS } from '../config/constants';
import { db } from '../lib/db';
import type { ScenarioVictim, VictimProfile } from '../types';

export const profilesService = {
  async fetchScenarioVictims(): Promise<ScenarioVictim[]> {
    const store = db;
    const victims = await authedGet<ScenarioVictim[]>(API_ENDPOINTS.TEST_SCENARIO_VICTIMS);
    await store.transaction('rw', store.scenarioVictims, async () => {
      await store.scenarioVictims.clear();
      await store.scenarioVictims.bulkPut(victims);
    });
    return victims;
  },
  async cachedScenarioVictims(): Promise<ScenarioVictim[]> {
    return db.scenarioVictims.toArray();
  },
  async cachedVictimByButton(buttonNumber: string): Promise<ScenarioVictim | undefined> {
    return db.scenarioVictims.where('button_number').equals(buttonNumber).first();
  },
  async fetchVictimProfile(id: number): Promise<VictimProfile> {
    const store = db;
    const profile = await authedGet<VictimProfile>(`${API_ENDPOINTS.VICTIM_PROFILES}${id}/`);
    await store.victimProfiles.put(profile);
    return profile;
  },
};

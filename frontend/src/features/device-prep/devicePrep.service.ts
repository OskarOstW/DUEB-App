import { authedGet } from '../../services/http';
import { API_ENDPOINTS } from '../../config/constants';
import { db } from '../../lib/db';
import { metaRepo } from '../../services/repos/meta.repo';
import type { Form, ScenarioVictim, VictimProfile } from '../../types';

export interface PrepProgress { step: string; progress: number }
export const devicePrepService = {
  async getLastPrep(): Promise<Date | null> {
    const value = await metaRepo.getLastExercisePrep();
    return value ? new Date(value) : null;
  },
  async prepareDevice(onProgress: (p: PrepProgress) => void = () => {}): Promise<void> {
    const store = db;
    onProgress({ step: 'Lade Übungsdaten…', progress: 0.2 });
    const [forms, victims, profiles] = await Promise.all([
      authedGet<Form[]>(API_ENDPOINTS.FORMS),
      authedGet<ScenarioVictim[]>(API_ENDPOINTS.TEST_SCENARIO_VICTIMS),
      authedGet<VictimProfile[]>(API_ENDPOINTS.VICTIM_PROFILES),
    ]);
    if (store !== db) throw new Error('Das Konto wurde während des Downloads gewechselt.');
    onProgress({ step: 'Speichere Übungsdaten…', progress: 0.8 });
    await store.transaction('rw', [store.forms, store.scenarioVictims, store.victimProfiles, store.appMeta], async () => {
      await store.forms.clear();
      await store.scenarioVictims.clear();
      await store.victimProfiles.clear();
      await store.forms.bulkPut(forms);
      await store.scenarioVictims.bulkPut(victims);
      await store.victimProfiles.bulkPut(profiles);
      await metaRepo.setLastExercisePrep(new Date().toISOString());
    });
    onProgress({ step: 'Übungsdaten verfügbar', progress: 1 });
  },
};

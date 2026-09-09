import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { profileEditsRepo } from '../../services/repos/profileEdits.repo';
import { triageKey, type TriageKey } from '../../lib/triage';
import type { ScenarioVictim } from '../../types';

export type StatusFilter = 'alle' | 'offen' | 'erledigt';
export type TriageFilter = 'alle' | TriageKey;

export interface ProfileResult {
  victim: ScenarioVictim;
  done: boolean;
  triage: TriageKey;
}

/**
 * Datenlogik der Patientenprofil-Seite: lädt Szenario-Opfer + Bearbeitungsstatus
 * aus Dexie (offline-first) und filtert/sortiert nach Suchbegriff, Status und Triage.
 */
export function useProfileSearch() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('alle');
  const [triage, setTriage] = useState<TriageFilter>('alle');

  const victims = useLiveQuery(() => db.scenarioVictims.toArray(), [], undefined);
  const editedKeys = useLiveQuery(
    async () => (await profileEditsRepo.all()).map((d) => d.buttonNumber),
    [],
    [] as string[],
  );
  const editedSet = useMemo(() => new Set(editedKeys ?? []), [editedKeys]);

  const loading = victims === undefined;
  const total = victims?.length ?? 0;
  const doneCount = useMemo(
    () => (victims ?? []).filter((v) => v.button_number && editedSet.has(v.button_number)).length,
    [victims, editedSet],
  );

  const results = useMemo<ProfileResult[]>(() => {
    const term = query.trim().toLowerCase();
    return (victims ?? [])
      .map((victim) => {
        const done = victim.button_number ? editedSet.has(victim.button_number) : false;
        return { victim, done, triage: triageKey(victim.victim_profile_data?.category) };
      })
      .filter(({ victim, done, triage: tk }) => {
        const p = victim.victim_profile_data;
        const button = (victim.button_number ?? '').toLowerCase();
        const name = `${p?.firstname ?? ''} ${p?.lastname ?? ''}`.toLowerCase();
        const diagnosis = (p?.diagnosis ?? '').toLowerCase();
        if (term && !button.includes(term) && !name.includes(term) && !diagnosis.includes(term)) {
          return false;
        }
        if (status === 'offen' && done) return false;
        if (status === 'erledigt' && !done) return false;
        if (triage !== 'alle' && tk !== triage) return false;
        return true;
      })
      .sort((a, b) => (a.victim.sequential_number ?? 0) - (b.victim.sequential_number ?? 0));
  }, [victims, editedSet, query, status, triage]);

  const resetFilters = () => {
    setQuery('');
    setStatus('alle');
    setTriage('alle');
  };

  return {
    query,
    setQuery,
    status,
    setStatus,
    triage,
    setTriage,
    results,
    loading,
    total,
    doneCount,
    openCount: total - doneCount,
    resetFilters,
    filtersActive: query.trim() !== '' || status !== 'alle' || triage !== 'alle',
  };
}

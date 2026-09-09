import { useDraftAutosave } from '../../hooks/useDraftAutosave';
import { currentOwner } from '../../services/http';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { db } from '../../lib/db';
import { profilesService } from '../../services/profiles.service';
import { profileEditsRepo } from '../../services/repos/profileEdits.repo';
import { useSessionStore } from '../../app/sessionStore';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import type { ProfileEditDraft } from '../../types';
import {
  MAX_ENTRIES,
  buildInitialDraft,
  emptyOpTeamRow,
  emptyVerlaufRow,
  formatButtonNumber,
  updateSichtungDataByCategory,
  type ProfileSource,
} from './profileData';

type TreatmentTable = 'sichtungData' | 'diagnostikData' | 'therapieData';
type TableLock = 'sichtungLocked' | 'diagnostikLocked' | 'therapieLocked';

export function useVictimProfile(buttonNumber: string) {
  const online = useOnlineStatus();
  const session = useSessionStore((s) => s.session);

  const [store] = useState(() => db);
  const { draft, saving, flush, replace, mutate: change } = useDraftAutosave<ProfileEditDraft | null>(
    null, async value => { if (value) await profileEditsRepo.save(value, store); });
  const mutate = useCallback((update: (value: ProfileEditDraft) => ProfileEditDraft) => {
    change(value => value ? update(value) : value);
  }, [change]);
  const [loadedButton, setLoadedButton] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const loaded = loadedButton === buttonNumber;

  const sourceRef = useRef<ProfileSource | null>(null);

  // Beobachtername aus der aktiven Sitzung.
  const observerName =
    `${session?.firstName ?? ''} ${session?.lastName ?? ''}`.trim() || (session?.username ?? '');

  // ---- Laden (online: Server-Refresh, offline: Dexie-Cache) ----
  useEffect(() => {
    let active = true;

    async function load() {
      await flush();
      const saved = await profileEditsRepo.get(buttonNumber);
      if (saved) {
        if (active) {
          sourceRef.current = saved.profileSnapshot ?? null;
          replace(saved);
          setNotFound(false);
          setLoadedButton(buttonNumber);
        }
        return;
      }
      if (navigator.onLine) {
        try {
          await profilesService.fetchScenarioVictims();
        } catch {
          /* offline/best-effort */
        }
      }

      const victim = await profilesService.cachedVictimByButton(buttonNumber);
      if (!victim) {
        if (active) {
          setNotFound(true);
          replace(null);
          setLoadedButton(buttonNumber);
        }
        return;
      }

      const profileId = victim.victim_profile;
      const source: ProfileSource | null = victim.victim_profile_data;

      if (!source) {
        if (active) {
          setNotFound(true);
          replace(null);
          setLoadedButton(buttonNumber);
        }
        return;
      }

      const displayButtonNumber = formatButtonNumber(victim.button_number ?? '', buttonNumber);
      const istSichtung = 'SK I';

      const base = buildInitialDraft({
        buttonNumber,
        displayButtonNumber,
        profileId,
        observerName,
        profile: source,
        istSichtung,
      });

      const merged: ProfileEditDraft = { ...base, owner: currentOwner(),
        scenarioId: victim.scenarioId, templateVersion: victim.version,
        assignmentId: victim.id, profileSnapshot: source };

      if (active) {
        sourceRef.current = source;
        replace(merged);
        setNotFound(false);
        setLoadedButton(buttonNumber);
      }
    }

    void load().catch(() => toast.error('Patientenentwurf konnte nicht geladen werden.'));
    return () => {
      active = false;
    };
  }, [buttonNumber, observerName, flush, replace]);

  // ---- KH-interne Nummer & IST-Sichtung ----
  const setKhIntern = useCallback((v: string) => mutate((d) => ({ ...d, khIntern: v })), [mutate]);
  const toggleKhLock = useCallback(() => mutate((d) => ({ ...d, khNumLocked: !d.khNumLocked })), [mutate]);

  const setIstSichtung = useCallback(
    (v: string) =>
      mutate((d) => ({
        ...d,
        istSichtung: v,
        sichtungData: updateSichtungDataByCategory(d.sichtungData, v, sourceRef.current),
      })),
    [mutate],
  );
  const toggleIstLock = useCallback(
    () => mutate((d) => ({ ...d, istSichtungLocked: !d.istSichtungLocked })),
    [mutate],
  );

  // ---- Behandlungstabellen ----
  const updateTreatmentRow = useCallback(
    (table: TreatmentTable, id: string, key: 'tatsaechlicheBehandlung' | 'von' | 'bis', value: string) =>
      mutate((d) => ({
        ...d,
        [table]: d[table].map((r) => (r.id === id ? { ...r, [key]: value } : r)),
      })),
    [mutate],
  );
  const toggleTableLock = useCallback(
    (lock: TableLock) => mutate((d) => ({ ...d, [lock]: !d[lock] })),
    [mutate],
  );

  // ---- OP-Team ----
  const addOpTeam = useCallback(
    () =>
      mutate((d) => {
        if (d.opTeam.length >= MAX_ENTRIES) {
          toast.warning('Limit erreicht', { description: `Maximal ${MAX_ENTRIES} OP-Team-Einträge möglich.` });
          return d;
        }
        return { ...d, opTeam: [...d.opTeam, emptyOpTeamRow()] };
      }),
    [mutate],
  );
  const updateOpTeam = useCallback(
    (id: string, key: 'name' | 'fach' | 'start' | 'dauer', value: string) =>
      mutate((d) => ({ ...d, opTeam: d.opTeam.map((r) => (r.id === id ? { ...r, [key]: value } : r)) })),
    [mutate],
  );
  const toggleOpTeamLock = useCallback(
    (id: string) =>
      mutate((d) => ({ ...d, opTeam: d.opTeam.map((r) => (r.id === id ? { ...r, locked: !r.locked } : r)) })),
    [mutate],
  );
  const removeOpTeam = useCallback(
    (id: string) => mutate((d) => ({ ...d, opTeam: d.opTeam.filter((r) => r.id !== id) })),
    [mutate],
  );

  // ---- Verlaufseinträge ----
  const addVerlauf = useCallback(
    () =>
      mutate((d) => {
        if (d.verlaufseintraege.length >= MAX_ENTRIES) {
          toast.warning('Limit erreicht', { description: `Maximal ${MAX_ENTRIES} Verlaufseinträge möglich.` });
          return d;
        }
        return { ...d, verlaufseintraege: [...d.verlaufseintraege, emptyVerlaufRow()] };
      }),
    [mutate],
  );
  const updateVerlauf = useCallback(
    (id: string, key: 'uhrzeit' | 'khBereich' | 'beobachtungen', value: string) =>
      mutate((d) => ({
        ...d,
        verlaufseintraege: d.verlaufseintraege.map((r) => (r.id === id ? { ...r, [key]: value } : r)),
      })),
    [mutate],
  );
  const toggleVerlaufLock = useCallback(
    (id: string) =>
      mutate((d) => ({
        ...d,
        verlaufseintraege: d.verlaufseintraege.map((r) => (r.id === id ? { ...r, locked: !r.locked } : r)),
      })),
    [mutate],
  );
  const removeVerlauf = useCallback(
    (id: string) => mutate((d) => ({ ...d, verlaufseintraege: d.verlaufseintraege.filter((r) => r.id !== id) })),
    [mutate],
  );

  return {
    draft,
    loaded,
    notFound,
    saving,
    online,
    flush,
    setKhIntern,
    toggleKhLock,
    setIstSichtung,
    toggleIstLock,
    updateTreatmentRow,
    toggleTableLock,
    addOpTeam,
    updateOpTeam,
    toggleOpTeamLock,
    removeOpTeam,
    addVerlauf,
    updateVerlauf,
    toggleVerlaufLock,
    removeVerlauf,
  };
}

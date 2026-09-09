import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';
import { devicePrepService } from './devicePrep.service';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { db, META_KEYS } from '../../lib/db';

export function useDevicePreparation() {
  const online = useOnlineStatus();
  const [preparing, setPreparing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('');
  const runningRef = useRef(false);

  const lastPrep = useLiveQuery(async () => {
    const entry = await db.appMeta.get(META_KEYS.LAST_EXERCISE_PREP);
    return entry?.value ? new Date(entry.value as string) : null;
  }, [], null);

  const prepare = useCallback(async (): Promise<boolean> => {
    if (runningRef.current) return false;
    if (!online) {
      toast.warning('Keine Internetverbindung', {
        description: 'Die Gerätevorbereitung erfordert eine Internetverbindung.',
      });
      return false;
    }
    runningRef.current = true;
    setPreparing(true);
    setProgress(0);
    try {
      await devicePrepService.prepareDevice(({ step: s, progress: p }) => {
        setStep(s);
        setProgress(p);
      });
      toast.success('Vorbereitung abgeschlossen', {
        description: 'Das Gerät wurde erfolgreich für die Übung vorbereitet.',
      });
      return true;
    } catch (err) {
      toast.error('Fehler bei der Vorbereitung', {
        description: err instanceof Error ? err.message : 'Unbekannter Fehler.',
      });
      return false;
    } finally {
      setPreparing(false);
      runningRef.current = false;
    }
  }, [online]);

  return { preparing, progress, step, lastPrep, prepare };
}

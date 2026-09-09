import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { registerDraftEditor } from '../lib/draftSaves';
import { TIMING } from '../config/constants';

/** Keep the latest edit synchronously, and drain writes before navigation or export. */
export function useDraftAutosave<T>(initial: T, persist: (value: T) => Promise<void>) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const latest = useRef(initial);
  const save = useRef(persist);
  const dirty = useRef(false);
  const inFlight = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async (): Promise<void> => {
    if (inFlight.current) await inFlight.current;
    if (!dirty.current) return;
    const operation = (async () => {
      setSaving(true);
      try {
        while (dirty.current) {
          dirty.current = false;
          await save.current(latest.current);
        }
      } catch (error) {
        dirty.current = true;
        toast.error('Speichern fehlgeschlagen', { description: 'Bitte die Seite geöffnet lassen und freien Gerätespeicher prüfen.' });
        throw error;
      } finally {
        setSaving(false);
      }
    })();
    inFlight.current = operation;
    try { await operation; } finally { inFlight.current = null; }
  }, []);

  const replace = useCallback((value: T) => {
    latest.current = value;
    setDraft(value);
  }, []);

  const mutate = useCallback((update: (value: T) => T) => {
    const value = update(latest.current);
    latest.current = value;
    dirty.current = true;
    setDraft(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush().catch(() => undefined), TIMING.AUTO_SAVE_DEBOUNCE);
  }, [flush]);

  useEffect(() => registerDraftEditor({ flush, pending: () => dirty.current || !!inFlight.current }), [flush]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    void flush().catch(() => undefined);
  }, [flush]);

  return { draft, saving, flush, replace, mutate, latest };
}

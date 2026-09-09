import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { formResponsesRepo } from '../services/repos/formResponses.repo';
import { profileEditsRepo } from '../services/repos/profileEdits.repo';

/**
 * Warnt beim Schließen/Neuladen des Tabs, solange ungesendete lokale Daten
 * (Formularantworten oder Profil-Edits) in Dexie liegen.
 */
export function useUnsavedDataWarning(): number {
  const pending = useLiveQuery(
    async () => (await formResponsesRepo.count()) + (await profileEditsRepo.count()),
    [],
    0,
  );

  useEffect(() => {
    if (!pending) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Legacy-Browser erwarten einen gesetzten returnValue.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [pending]);

  return pending ?? 0;
}

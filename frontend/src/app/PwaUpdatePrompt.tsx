import { flushDrafts } from '../lib/draftSaves';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UPDATE_ID = 'pwa-update';
const OFFLINE_ID = 'pwa-offline-ready';

/**
 * Steuert den Service-Worker-Update-Flow. Zeigt einen Toast "Neue Version
 * verfügbar – neu laden", damit in der Übung kein veralteter SW aktiv bleibt.
 */
export function PwaUpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (!offlineReady) return;
    toast.success('Offline bereit', {
      id: OFFLINE_ID,
      description: 'Die App ist gespeichert. Bitte vor dem Offline-Einsatz anmelden und Übungsdaten laden.',
      duration: 4000,
      onDismiss: () => setOfflineReady(false),
      onAutoClose: () => setOfflineReady(false),
    });
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (!needRefresh) return;
    toast('Neue Version verfügbar', {
      id: UPDATE_ID,
      description: 'Bitte neu laden, um die aktuelle Version zu nutzen.',
      duration: Infinity,
      action: {
        label: 'Neu laden',
        onClick: () => void flushDrafts().then(() => updateServiceWorker(true)).catch(() => toast.error('Aktualisierung angehalten: Entwürfe konnten nicht gespeichert werden.')),
      },
      cancel: {
        label: 'Später',
        onClick: () => setNeedRefresh(false),
      },
      onDismiss: () => setNeedRefresh(false),
    });
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}

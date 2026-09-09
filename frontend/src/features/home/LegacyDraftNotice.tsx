import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '../../app/sessionStore';
import { exportLegacyDrafts, legacyDraftCount } from '../../services/localArchives.service';

export function LegacyDraftNotice() {
  const session = useSessionStore(state => state.session);
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    if (session) void legacyDraftCount(session).then(value => { if (active) setCount(value); })
      .catch(() => toast.error('Frühere lokale Entwürfe konnten nicht gelesen werden.'));
    return () => { active = false; };
  }, [session]);
  if (!session || !count) return null;
  return <Alert><AlertDescription className="space-y-2">
    <p>Auf diesem Gerät liegen {count} Einträge aus einer früheren App-Version. Ihre Übungszuordnung ist nicht gesichert. Exportieren Sie diese Daten zur manuellen Übernahme.</p>
    <Button variant="outline" onClick={() => void exportLegacyDrafts(session).catch(error => toast.error(String(error)))}>Frühere Entwürfe sichern</Button>
  </AlertDescription></Alert>;
}

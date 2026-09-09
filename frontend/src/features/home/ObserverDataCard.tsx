import { useState } from 'react';
import { toast } from 'sonner';
import { CloudDownload, WifiOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { observerDataService } from '../../services/observerData.service';
import { useSessionStore } from '../../app/sessionStore';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

/**
 * Beobachter-Nachbearbeitung: holt die bereits abgegebenen Daten vom Server
 * zum Weiterbearbeiten in der PWA.
 */
export function ObserverDataCard() {
  const session = useSessionStore((s) => s.session);
  const online = useOnlineStatus();
  const [loading, setLoading] = useState(false);

  const handleLoad = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const name = `${session.firstName ?? ''} ${session.lastName ?? ''}`.trim() || session.username;
      const summary = await observerDataService.loadMyData(name);
      toast.success('Daten geladen', {
        description: `${summary.forms} Formular(e) und ${summary.profiles} Profil(e) zum Bearbeiten geladen.`,
      });
    } catch (err) {
      toast.error('Laden fehlgeschlagen', {
        description: err instanceof Error ? err.message : 'Daten konnten nicht geladen werden.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-start gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <CloudDownload className="size-6" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold">Meine Übungsdaten laden</h3>
            <p className="text-sm text-muted-foreground">
              Bereits gesendete Antworten zum Nachbearbeiten holen
            </p>
          </div>
        </div>

        {!online && (
          <p className="flex items-center gap-2 text-sm text-status-offline">
            <WifiOff className="size-4" /> Offline – Laden ist nur online möglich.
          </p>
        )}

        <Button onClick={handleLoad} disabled={loading || !online} className="w-full" size="lg">
          <CloudDownload className={loading ? 'size-4 animate-pulse' : 'size-4'} />
          {loading ? 'Lädt…' : 'Meine Daten laden'}
        </Button>
      </CardContent>
    </Card>
  );
}

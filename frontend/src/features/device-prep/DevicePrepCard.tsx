import { TabletSmartphone, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useDevicePreparation } from './useDevicePreparation';

function formatDate(d: Date): string {
  return d.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

export function DevicePrepCard() {
  const { preparing, progress, step, lastPrep, prepare } = useDevicePreparation();

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-start gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <TabletSmartphone className="size-6" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold">Gerät vorbereiten</h3>
            <p className="text-sm text-muted-foreground">
              {lastPrep ? `Zuletzt: ${formatDate(lastPrep)}` : 'Noch nicht vorbereitet'}
            </p>
          </div>
        </div>

        {preparing && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">{step}</p>
            <Progress value={progress * 100} />
          </div>
        )}

        <Button onClick={() => void prepare()} disabled={preparing} className="w-full" size="lg">
          <RefreshCw className={preparing ? 'size-4 animate-spin' : 'size-4'} />
          {preparing ? 'Lädt…' : 'Übungsdaten laden'}
        </Button>
      </CardContent>
    </Card>
  );
}

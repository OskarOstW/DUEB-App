import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { TimestampEntry } from '../../types';
import { formatTimestamp, parseTimestamp } from './timestamps';

const pad = (n: number) => String(n).padStart(2, '0');

/** Ortszeit für das Eingabefeld, ohne Umrechnung nach UTC. */
function toLocalInput(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

interface TimestampListProps {
  timestamps: TimestampEntry[];
  onUpdate: (tsId: string, patch: Partial<TimestampEntry>) => void;
  onRemove: (tsId: string) => void;
}

export function TimestampList({ timestamps, onUpdate, onRemove }: TimestampListProps) {
  if (timestamps.length === 0) return null;

  return (
    <div className="mt-1 space-y-2">
      {timestamps.map((ts) => {
        const asDate = parseTimestamp(ts.timestamp);
        return (
          <div
            key={ts.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2"
          >
            <Input
              type="datetime-local"
              aria-label="Zeitstempel"
              className="h-9 w-full min-w-[220px] text-sm sm:w-auto"
              value={asDate ? toLocalInput(asDate) : ''}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                const d = new Date(val);
                if (!Number.isNaN(d.getTime())) {
                  onUpdate(ts.id, { timestamp: formatTimestamp(d) });
                }
              }}
            />
            <Input
              className="h-9 min-w-0 flex-1 text-sm"
              placeholder="Notiz hinzufügen…"
              aria-label="Notiz zum Zeitstempel"
              value={ts.note}
              onChange={(e) => onUpdate(ts.id, { note: e.target.value })}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onRemove(ts.id)}
              aria-label="Zeitstempel löschen"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

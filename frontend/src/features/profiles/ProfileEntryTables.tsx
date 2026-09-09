import { Plus, Trash2, Users, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { SectionTitle } from '@/components/SectionTitle';
import { LockButton } from '@/components/LockButton';
import type { OpTeamRow, VerlaufRow } from '../../types';

const th = 'px-2 py-2 text-left text-xs font-semibold text-muted-foreground';
const td = 'px-2 py-2 align-top';

function RowActions({
  locked,
  onToggleLock,
  onRemove,
}: {
  locked: boolean;
  onToggleLock: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <LockButton locked={locked} onClick={onToggleLock} size="sm" aria-label="Eintrag bestätigen" />
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onRemove}
        disabled={locked}
        aria-label="Eintrag löschen"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

interface OpTeamTableProps {
  rows: OpTeamRow[];
  onAdd: () => void;
  onUpdate: (id: string, key: 'name' | 'fach' | 'start' | 'dauer', value: string) => void;
  onToggleLock: (id: string) => void;
  onRemove: (id: string) => void;
}

export function OpTeamTable({ rows, onAdd, onUpdate, onToggleLock, onRemove }: OpTeamTableProps) {
  return (
    <Card className="p-4">
      <SectionTitle icon={<Users />} title="Eingesetztes OP-Team" />
      <div className="-mx-2 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className={th}>Name</th>
              <th className={th}>Fachdisziplin</th>
              <th className={`${th} w-[110px]`}>von</th>
              <th className={`${th} w-[90px]`}>Dauer</th>
              <th className={`${th} w-[90px]`} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-3 text-center text-sm text-muted-foreground">
                  Noch keine Teammitglieder
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className={td}>
                    <Input
                      className="h-9 text-sm"
                      placeholder="Name"
                      disabled={row.locked}
                      aria-label="OP-Team: Name"
                      value={row.name}
                      onChange={(e) => onUpdate(row.id, 'name', e.target.value)}
                    />
                  </td>
                  <td className={td}>
                    <Input
                      className="h-9 text-sm"
                      placeholder="Fachdisziplin"
                      disabled={row.locked}
                      aria-label="OP-Team: Fachdisziplin"
                      value={row.fach}
                      onChange={(e) => onUpdate(row.id, 'fach', e.target.value)}
                    />
                  </td>
                  <td className={td}>
                    <Input
                      type="time"
                      className="h-9 text-sm"
                      disabled={row.locked}
                      aria-label="OP-Team: Beginn"
                      value={row.start}
                      onChange={(e) => onUpdate(row.id, 'start', e.target.value)}
                    />
                  </td>
                  <td className={td}>
                    <Input
                      className="h-9 text-sm"
                      placeholder="1h"
                      disabled={row.locked}
                      aria-label="OP-Team: Dauer"
                      value={row.dauer}
                      onChange={(e) => onUpdate(row.id, 'dauer', e.target.value)}
                    />
                  </td>
                  <td className={td}>
                    <RowActions
                      locked={row.locked}
                      onToggleLock={() => onToggleLock(row.id)}
                      onRemove={() => onRemove(row.id)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Button variant="secondary" size="sm" className="mt-3" onClick={onAdd}>
        <Plus className="size-4" />
        Eintrag hinzufügen
      </Button>
    </Card>
  );
}

interface VerlaufTableProps {
  rows: VerlaufRow[];
  onAdd: () => void;
  onUpdate: (id: string, key: 'uhrzeit' | 'khBereich' | 'beobachtungen', value: string) => void;
  onToggleLock: (id: string) => void;
  onRemove: (id: string) => void;
}

export function VerlaufTable({ rows, onAdd, onUpdate, onToggleLock, onRemove }: VerlaufTableProps) {
  return (
    <Card className="p-4">
      <SectionTitle icon={<FileText />} title="Bemerkungen zum Verlauf" />
      <div className="-mx-2 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className={`${th} w-[110px]`}>Uhrzeit</th>
              <th className={`${th} w-[140px]`}>KH-Bereich</th>
              <th className={th}>Beobachtungen</th>
              <th className={`${th} w-[90px]`} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-3 text-center text-sm text-muted-foreground">
                  Noch keine Einträge vorhanden
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className={td}>
                    <Input
                      type="time"
                      className="h-9 text-sm"
                      disabled={row.locked}
                      aria-label="Verlauf: Uhrzeit"
                      value={row.uhrzeit}
                      onChange={(e) => onUpdate(row.id, 'uhrzeit', e.target.value)}
                    />
                  </td>
                  <td className={td}>
                    <Input
                      className="h-9 text-sm"
                      placeholder="z.B. OP, ITS…"
                      disabled={row.locked}
                      aria-label="Verlauf: KH-Bereich"
                      value={row.khBereich}
                      onChange={(e) => onUpdate(row.id, 'khBereich', e.target.value)}
                    />
                  </td>
                  <td className={td}>
                    <Textarea
                      rows={1}
                      className="min-h-9 text-sm"
                      placeholder="Bemerkungen"
                      disabled={row.locked}
                      aria-label="Verlauf: Beobachtungen"
                      value={row.beobachtungen}
                      onChange={(e) => onUpdate(row.id, 'beobachtungen', e.target.value)}
                    />
                  </td>
                  <td className={td}>
                    <RowActions
                      locked={row.locked}
                      onToggleLock={() => onToggleLock(row.id)}
                      onRemove={() => onRemove(row.id)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Button variant="secondary" size="sm" className="mt-3" onClick={onAdd}>
        <Plus className="size-4" />
        Eintrag hinzufügen
      </Button>
    </Card>
  );
}

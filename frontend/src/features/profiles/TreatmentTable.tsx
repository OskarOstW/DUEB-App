import { List } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SectionTitle } from '@/components/SectionTitle';
import { LockButton } from '@/components/LockButton';
import type { TreatmentRow } from '../../types';

interface TreatmentTableProps {
  title: string;
  rows: TreatmentRow[];
  locked: boolean;
  onLockToggle: () => void;
  onCellChange: (id: string, key: 'tatsaechlicheBehandlung' | 'von' | 'bis', value: string) => void;
}

const th = 'px-2 py-2 text-left text-xs font-semibold text-muted-foreground';
const td = 'px-2 py-2 align-top';

export function TreatmentTable({ title, rows, locked, onLockToggle, onCellChange }: TreatmentTableProps) {
  return (
    <Card className="p-4">
      <SectionTitle
        icon={<List />}
        title={title}
        action={<LockButton locked={locked} onClick={onLockToggle} size="sm" />}
      />
      <div className="-mx-2 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className={th}>Ort</th>
              <th className={th}>Verletztenkatalog</th>
              <th className={th}>Behandlung</th>
              <th className={`${th} w-[110px]`}>von</th>
              <th className={`${th} w-[110px]`}>bis</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className={td}>
                  <span className="text-sm font-medium">{row.place}</span>
                </td>
                <td className={td}>
                  <span className="text-xs text-muted-foreground">{row.verletztenkatalog || '–'}</span>
                </td>
                <td className={td}>
                  <Textarea
                    rows={1}
                    className="min-h-9 text-sm"
                    placeholder="Behandlung"
                    disabled={locked}
                    aria-label={`${title}: ${row.place}, Behandlung`}
                    value={row.tatsaechlicheBehandlung}
                    onChange={(e) => onCellChange(row.id, 'tatsaechlicheBehandlung', e.target.value)}
                  />
                </td>
                <td className={td}>
                  <Input
                    type="time"
                    className="h-9 text-sm"
                    disabled={locked}
                    aria-label={`${title}: ${row.place}, Beginn`}
                    value={row.von}
                    onChange={(e) => onCellChange(row.id, 'von', e.target.value)}
                  />
                </td>
                <td className={td}>
                  <Input
                    type="time"
                    className="h-9 text-sm"
                    disabled={locked}
                    aria-label={`${title}: ${row.place}, Ende`}
                    value={row.bis}
                    onChange={(e) => onCellChange(row.id, 'bis', e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

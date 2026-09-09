import { ChevronRight } from 'lucide-react';
import { TriageBadge } from '@/components/TriageBadge';
import { cn } from '@/lib/utils';
import { formatButtonNumber } from './profileData';
import type { ProfileResult } from './useProfileSearch';

interface PatientCardProps {
  result: ProfileResult;
  onClick: () => void;
}

function VitalChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </span>
  );
}

/** Trefferkarte der Patientenprofil-Seite (Triage prominent, ohne Rand-Striche). */
export function PatientCard({ result, onClick }: PatientCardProps) {
  const { victim, done } = result;
  const p = victim.victim_profile_data;
  const display = formatButtonNumber('', victim.button_number ?? '');
  const name = `${p?.firstname ?? ''} ${p?.lastname ?? ''}`.trim();

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full w-full flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-lg font-bold tracking-tight">{display}</span>
        <span
          className={cn(
            'shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold',
            done ? 'bg-status-online/10 text-status-online' : 'bg-secondary text-muted-foreground',
          )}
        >
          {done ? 'Erledigt' : 'Offen'}
        </span>
      </div>

      <TriageBadge category={p?.category} size="md" className="self-start" />

      <div className="min-h-0 flex-1">
        <p className="font-semibold leading-tight">{name || 'Kein Name'}</p>
        {p?.diagnosis && (
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{p.diagnosis}</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {p?.gcs && <VitalChip label="GCS" value={p.gcs} />}
          {p?.spo2 && <VitalChip label="SpO₂" value={p.spo2} />}
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

import { Navigate, useNavigate } from 'react-router-dom';
import { Search, Stethoscope, SearchX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Segmented } from '@/components/Segmented';
import { cn } from '@/lib/utils';
import { TRIAGE_SURFACE, TRIAGE_LABEL, type TriageKey } from '@/lib/triage';
import { ROUTES } from '../../config/constants';
import { useSessionStore } from '../../app/sessionStore';
import { canSeeProfiles } from '../../lib/access';
import { PatientCard } from './PatientCard';
import { useProfileSearch, type TriageFilter } from './useProfileSearch';

const TRIAGE_CHIPS: TriageFilter[] = ['alle', 'sk1', 'sk2', 'sk3', 'sk4'];

export function ProfileSearchPage() {
  const navigate = useNavigate();
  const session = useSessionStore((st) => st.session);
  const s = useProfileSearch();

  // Beobachter ohne Profil-Recht haben hier nichts zu suchen.
  if (!canSeeProfiles(session)) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  const openProfile = (buttonNumber: string | null) => {
    if (!buttonNumber) return;
    navigate(ROUTES.PROFILE.replace(':buttonNumber', buttonNumber));
  };

  const subtitle = s.loading
    ? 'Lädt…'
    : `${s.total} Patient${s.total === 1 ? '' : 'en'} · ${s.doneCount} bearbeitet · ${s.openCount} offen`;

  return (
    <div className="space-y-5">
      <PageHeader title="Patientenprofile" subtitle={subtitle} />

      {/* Steuerleiste */}
      <div className="sticky top-14 z-20 -mx-4 space-y-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:top-0">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Button-Nr., Name oder Diagnose…"
            aria-label="Patientenprofile suchen"
            value={s.query}
            onChange={(e) => s.setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Segmented
            className="sm:w-72"
            value={s.status}
            onChange={s.setStatus}
            options={[
              { value: 'alle', label: 'Alle' },
              { value: 'offen', label: 'Offen' },
              { value: 'erledigt', label: 'Erledigt' },
            ]}
          />

          <div className="flex flex-wrap gap-1.5">
            {TRIAGE_CHIPS.map((key) => {
              const active = s.triage === key;
              const label = key === 'alle' ? 'Alle' : TRIAGE_LABEL[key as TriageKey];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => s.setTriage(key)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-semibold transition-colors',
                    active && key !== 'alle' && TRIAGE_SURFACE[key as TriageKey],
                    active && key === 'alle' && 'bg-primary text-primary-foreground',
                    !active && 'bg-secondary text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Inhalt */}
      {s.loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : s.total === 0 ? (
        <EmptyState
          icon={<Stethoscope />}
          title="Keine Patientenprofile"
          description="Bitte zuerst das Gerät vorbereiten bzw. die Übungsdaten laden, um Profile anzuzeigen."
        />
      ) : s.results.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title="Keine Treffer"
          description="Mit den aktuellen Filtern wurde nichts gefunden."
          action={
            <Button variant="outline" onClick={s.resetFilters}>
              Filter zurücksetzen
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {s.results.map((r) => (
            <PatientCard key={r.victim.id} result={r} onClick={() => openProfile(r.victim.button_number)} />
          ))}
        </div>
      )}
    </div>
  );
}

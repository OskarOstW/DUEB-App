import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Building2, Eye, User, WifiOff, Save } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SectionTitle } from '@/components/SectionTitle';
import { LockButton } from '@/components/LockButton';
import { cn } from '@/lib/utils';
import { triageKey, TRIAGE_SURFACE } from '@/lib/triage';
import { ROUTES } from '../../config/constants';
import { useSessionStore } from '../../app/sessionStore';
import { canSeeProfiles } from '../../lib/access';
import { SICHTUNG_OPTIONS } from './profileData';
import { useVictimProfile } from './useVictimProfile';
import { DiagnosticCard, VitalCard } from './ProfileInfoCards';
import { TreatmentTable } from './TreatmentTable';
import { OpTeamTable, VerlaufTable } from './ProfileEntryTables';

export function VictimProfilePage() {
  const { buttonNumber: buttonParam } = useParams<{ buttonNumber: string }>();
  const buttonNumber = buttonParam ?? '';
  const navigate = useNavigate();
  const p = useVictimProfile(buttonNumber);
  const session = useSessionStore((st) => st.session);

  if (!canSeeProfiles(session)) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  if (!p.loaded) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (p.notFound || !p.draft) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>Profil konnte nicht geladen werden. Bitte Gerät neu vorbereiten.</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => navigate(ROUTES.PROFILES)}>
          <ArrowLeft className="size-4" />
          Zurück
        </Button>
      </div>
    );
  }

  const d = p.draft;
  const triageCls = TRIAGE_SURFACE[triageKey(d.sollSichtung)];

  const goBack = () => {
    void p.flush().then(() => navigate(ROUTES.PROFILES)).catch(() => undefined);
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Triage-Kopfzeile */}
      <div className={cn('flex items-center justify-between gap-3 rounded-xl p-4', triageCls)}>
        <span className="text-2xl font-extrabold">{d.displayButtonNumber}</span>
        <div className="text-center">
          <div className="text-xs uppercase opacity-90">SOLL-Sichtung</div>
          <div className="font-bold">{d.sollSichtung || 'Nicht definiert'}</div>
        </div>
        <span className="text-sm font-semibold">KH: {d.khIntern || '–'}</span>
      </div>

      {/* Beobachter */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <User className="size-4" />
        Beobachter: {d.observerName || 'Unbekannt'}
        {p.saving && <span className="ml-auto text-xs">Speichert…</span>}
      </div>

      {!p.online && (
        <Alert>
          <WifiOff className="size-4" />
          <AlertDescription>Offline-Modus – Eingaben werden lokal gespeichert.</AlertDescription>
        </Alert>
      )}

      <DiagnosticCard {...d.diagnosticLoaded} />
      <VitalCard {...d.vitalwerte} />

      {/* KH-Interne Nummer */}
      <Card className="p-4">
        <SectionTitle icon={<Building2 />} title="KH-interne Nummer" />
        <div className="flex items-center gap-2">
          <Input
            className="flex-1"
            placeholder="Nummer eingeben…"
            disabled={d.khNumLocked}
            aria-label="KH-interne Nummer"
            value={d.khIntern}
            onChange={(e) => p.setKhIntern(e.target.value)}
          />
          <LockButton locked={d.khNumLocked} onClick={p.toggleKhLock} aria-label="KH-Nummer bestätigen" />
        </div>
      </Card>

      {/* IST-Sichtung */}
      <Card className="p-4">
        <SectionTitle icon={<Eye />} title="IST-Sichtung (Ergebnis)" />
        <div className="flex items-center gap-2">
          <div className="flex flex-1 flex-wrap gap-2">
            {SICHTUNG_OPTIONS.map((sk) => {
              const selected = d.istSichtung === sk;
              return (
                <button
                  key={sk}
                  type="button"
                  disabled={d.istSichtungLocked}
                  onClick={() => !d.istSichtungLocked && p.setIstSichtung(sk)}
                  className={cn(
                    'min-w-14 flex-1 rounded-lg border px-3 py-2 text-center text-sm font-bold transition-colors',
                    selected
                      ? `border-transparent ${TRIAGE_SURFACE[triageKey(sk)]}`
                      : 'border-input bg-card hover:bg-secondary',
                    d.istSichtungLocked && !selected && 'opacity-50',
                  )}
                >
                  {sk}
                </button>
              );
            })}
          </div>
          <LockButton
            locked={d.istSichtungLocked}
            onClick={p.toggleIstLock}
            aria-label="IST-Sichtung bestätigen"
          />
        </div>
      </Card>

      {/* Behandlungstabellen */}
      <TreatmentTable
        title="Sichtung"
        rows={d.sichtungData}
        locked={d.sichtungLocked}
        onLockToggle={() => p.toggleTableLock('sichtungLocked')}
        onCellChange={(id, key, value) => p.updateTreatmentRow('sichtungData', id, key, value)}
      />
      <TreatmentTable
        title="Diagnostik"
        rows={d.diagnostikData}
        locked={d.diagnostikLocked}
        onLockToggle={() => p.toggleTableLock('diagnostikLocked')}
        onCellChange={(id, key, value) => p.updateTreatmentRow('diagnostikData', id, key, value)}
      />
      <TreatmentTable
        title="Therapie"
        rows={d.therapieData}
        locked={d.therapieLocked}
        onLockToggle={() => p.toggleTableLock('therapieLocked')}
        onCellChange={(id, key, value) => p.updateTreatmentRow('therapieData', id, key, value)}
      />

      {/* OP-Team & Verlauf */}
      <OpTeamTable
        rows={d.opTeam}
        onAdd={p.addOpTeam}
        onUpdate={p.updateOpTeam}
        onToggleLock={p.toggleOpTeamLock}
        onRemove={p.removeOpTeam}
      />
      <VerlaufTable
        rows={d.verlaufseintraege}
        onAdd={p.addVerlauf}
        onUpdate={p.updateVerlauf}
        onToggleLock={p.toggleVerlaufLock}
        onRemove={p.removeVerlauf}
      />

      {/* Fixierter Speichern-Footer */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 pt-2 pb-[calc(0.5rem_+_env(safe-area-inset-bottom))] backdrop-blur md:left-64">
        <div className="mx-auto flex max-w-5xl justify-center">
          <Button onClick={goBack}>
            <Save className="size-4" />
            Speichern &amp; zurück
          </Button>
        </div>
      </div>
    </div>
  );
}

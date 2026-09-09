import { useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Stethoscope,
  Contact,
  Images,
  Send,
  WifiOff,
  ChevronRight,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StatusBadge } from '@/components/StatusBadge';
import { PageHeader } from '@/components/PageHeader';
import { PartnerCard } from '@/components/PartnerCard';
import { db } from '../../lib/db';
import { formResponsesRepo } from '../../services/repos/formResponses.repo';
import { profileEditsRepo } from '../../services/repos/profileEdits.repo';
import { isFormAllowed, canSeeProfiles } from '../../lib/access';
import { useSessionStore } from '../../app/sessionStore';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { ROLES, ROUTES } from '../../config/constants';
import { DevicePrepCard } from '../device-prep/DevicePrepCard';
import { ObserverDataCard } from './ObserverDataCard';
import { SendDataModal } from './SendDataModal';
import { LegacyDraftNotice } from './LegacyDraftNotice';
import { useForms, useScenarioVictims, useContacts, useGalleryImages } from './queries';

interface StatTileProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  count?: number;
  onClick: () => void;
}

function StatTile({ icon: Icon, label, hint, count, onClick }: StatTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
        <Icon className="size-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums">{count ?? 0}</span>
          <span className="font-semibold">{label}</span>
        </div>
        <p className="truncate text-sm text-muted-foreground">{hint}</p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

export function HomePage() {
  const session = useSessionStore((s) => s.session);
  const online = useOnlineStatus();
  const navigate = useNavigate();
  const isAdmin = session?.role === ROLES.ADMIN;
  const [sendOpen, setSendOpen] = useState(false);

  // Hintergrund-Refresh der Dexie-Snapshots (offline schlägt still fehl).
  useForms();
  useScenarioVictims();
  useContacts();
  useGalleryImages();

  // Beobachter: nur freigegebene Formulare zaehlen; Profile nur wenn das Konto sie sehen darf.
  const allForms = useLiveQuery(() => db.forms.toArray(), [], []);
  const formCount = allForms.filter((f) => isFormAllowed(session, f.id)).length;
  const rawVictimCount = useLiveQuery(() => db.scenarioVictims.count(), [], 0);
  const victimCount = canSeeProfiles(session) ? rawVictimCount ?? 0 : 0;
  const contactCount = useLiveQuery(() => db.contacts.count(), [], 0);
  const galleryCount = useLiveQuery(() => db.galleryImages.count(), [], 0);
  const pendingForms = useLiveQuery(() => formResponsesRepo.count(), [], 0);
  const pendingProfiles = useLiveQuery(() => profileEditsRepo.count(), [], 0);
  const pendingTotal = (pendingForms ?? 0) + (pendingProfiles ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Willkommen, ${session?.firstName || session?.username || ''}`.trim()}
        subtitle={`Angemeldet als ${session?.role === ROLES.ADMIN ? 'Administrator' : 'Beobachter'}`}
      />

      {!online && (
        <Alert>
          <WifiOff className="size-4" />
          <AlertDescription>
            Offline-Modus – lokale Daten werden angezeigt. Senden ist erst wieder online möglich.
          </AlertDescription>
        </Alert>
      )}

      <LegacyDraftNotice />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex h-full flex-col gap-4 pt-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold">Datenübertragung</h3>
                <p className="text-sm text-muted-foreground">
                  Ausgefüllte Formulare & bearbeitete Profile senden
                </p>
              </div>
              {pendingTotal > 0 ? (
                <StatusBadge tone="pending">{pendingTotal} ungesendet</StatusBadge>
              ) : (
                <StatusBadge tone="ok">Alles gesendet</StatusBadge>
              )}
            </div>
            <div className="mt-auto">
              <Button
                size="lg"
                className="w-full"
                onClick={() => setSendOpen(true)}
              >
                <Send className="size-4" />
                Alle Daten senden
              </Button>
            </div>
          </CardContent>
        </Card>

        <DevicePrepCard />
        {!isAdmin && <ObserverDataCard />}
      </div>

      {/* Überblick */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">Überblick</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatTile
            icon={ClipboardList}
            label="Formulare"
            hint="Beobachtungsbögen ausfüllen"
            count={formCount}
            onClick={() => navigate(ROUTES.FORMS)}
          />
          <StatTile
            icon={Stethoscope}
            label="Patientenprofile"
            hint="Profile suchen & bearbeiten"
            count={victimCount}
            onClick={() => navigate(ROUTES.PROFILES)}
          />
          <StatTile
            icon={Contact}
            label="Kontakte"
            hint="Ansprechpartner der Übung"
            count={contactCount}
            onClick={() => navigate(ROUTES.CONTACTS)}
          />
          <StatTile
            icon={Images}
            label="Galerie"
            hint="Bildmaterial ansehen"
            count={galleryCount}
            onClick={() => navigate(ROUTES.GALLERY)}
          />
        </div>
      </div>

      <PartnerCard />

      <SendDataModal opened={sendOpen} onClose={() => setSendOpen(false)} />
    </div>
  );
}

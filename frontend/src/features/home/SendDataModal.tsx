import { ROLES } from '../../config/constants';
import { ApiError } from '../../lib/apiClient';
import { useState } from 'react';
import { toast } from 'sonner';
import { ClipboardList, Send, Users, WifiOff } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formResponsesRepo } from '../../services/repos/formResponses.repo';
import { profileEditsRepo } from '../../services/repos/profileEdits.repo';
import { syncService } from '../../services/sync.service';
import { useSessionStore } from '../../app/sessionStore';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { db } from '../../lib/db';
import { archiveCurrentDrafts } from '../../services/localArchives.service';

interface SendDataModalProps {
  opened: boolean;
  onClose: () => void;
}

export function SendDataModal({ opened, onClose }: SendDataModalProps) {
  const session = useSessionStore((s) => s.session);
  const online = useOnlineStatus();
  const [sending, setSending] = useState(false);
  const [conflict, setConflict] = useState(false);

  const forms = useLiveQuery(() => formResponsesRepo.all(), [], []);
  const profiles = useLiveQuery(() => profileEditsRepo.all(), [], []);
  const images = useLiveQuery(() => db.images.toArray(), [], []);
  const [archiveConfirm, setArchiveConfirm] = useState(false);

  const formList = forms ?? [];
  const profileList = profiles ?? [];
  const orphanCount = (images ?? []).filter(image => !formList.some(form => form.formId === image.formId)).length;
  const total = formList.length + profileList.length + orphanCount;

  const handleSend = async () => {
    if (!session) return;
    setSending(true);
    try {
      const summary = await syncService.sendAllData(session);
      toast.success('Senden erfolgreich', {
        description: `${summary.forms} Formular(e) und ${summary.profiles} Profil(e) übertragen.`,
      });
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setConflict(true);
      toast.error('Fehler beim Senden', {
        description:
          err instanceof Error
            ? err.message
            : 'Übertragung fehlgeschlagen. Daten bleiben lokal gespeichert.',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={opened} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Alle Daten senden</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {orphanCount > 0 && <p className="text-sm">{orphanCount} Foto(s) haben keinen zugehörigen Entwurf. Sie sind im lokalen Export enthalten.</p>}
          {session?.role === ROLES.ADMIN && <p className="text-sm">Zum Übertragen bitte als Beobachter anmelden. Lokale Entwürfe können Sie hier sichern.</p>}
          {conflict && (
            <Alert variant="destructive">
              <AlertDescription className="space-y-3">
                <p>Ein anderes Gerät hat den Serverstand geändert. Ihre lokalen Daten bleiben erhalten.
                Stimmen Sie die Änderungen ab und sichern Sie zuerst die lokalen Entwürfe.
                "Lokalen Stand übernehmen" ersetzt beim nächsten Senden die entsprechenden eigenen Antworten auf dem Server.
                Der vorherige Stand wird lokal im Konfliktarchiv vermerkt.</p>
                <Button variant="outline" disabled={sending || !online} onClick={() => {
                  setSending(true);
                  void syncService.resolveConflict().then(() => setConflict(false))
                    .catch(error => toast.error(error instanceof Error ? error.message : 'Abgleich fehlgeschlagen'))
                    .finally(() => setSending(false));
                }}>Lokalen Stand übernehmen</Button>
              </AlertDescription>
            </Alert>
          )}
          {!online && (
            <Alert>
              <WifiOff className="size-4" />
              <AlertDescription>
                Offline – Senden ist erst wieder mit Internetverbindung möglich.
              </AlertDescription>
            </Alert>
          )}

          {total === 0 ? (
            <p className="text-sm text-muted-foreground">
              Es gibt keine ungesendeten Formulare oder Profile.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm">Folgende Daten werden an den Server übertragen:</p>

              {formList.length > 0 && (
                <div>
                  <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                    <ClipboardList className="size-4 text-muted-foreground" />
                    {formList.length} Formular(e)
                  </div>
                  <ul className="ml-6 list-disc text-sm text-muted-foreground">
                    {formList.map((f) => (
                      <li key={f.formId}>{f.formName}</li>
                    ))}
                  </ul>
                </div>
              )}

              {profileList.length > 0 && (
                <div>
                  <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                    <Users className="size-4 text-muted-foreground" />
                    {profileList.length} Patientenprofil(e)
                  </div>
                  <ul className="ml-6 list-disc text-sm text-muted-foreground">
                    {profileList.map((p) => (
                      <li key={p.buttonNumber}>{p.displayButtonNumber || p.buttonNumber}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">Eine lokale Sicherung enthält Ihre Eingaben und Bilder. Bewahren Sie sie geschützt auf.</p>
        <Button variant="outline" disabled={sending || !session} onClick={() => {
          if (session) void syncService.exportLocalData(session).catch(error => toast.error(error instanceof Error ? error.message : 'Sicherung fehlgeschlagen'));
        }}>Lokale Entwürfe sichern</Button>
        {total > 0 && <Button variant="outline" disabled={sending} onClick={() => setArchiveConfirm(true)}>Für eine neue Übung archivieren…</Button>}
        {archiveConfirm && <Alert><AlertDescription className="space-y-2">
          <p>Alle aktuellen Entwürfe und Fotos werden im lokalen Archiv erhalten und aus der Versandliste entfernt. Das Archiv ist im lokalen Export enthalten. Danach können Sie neue Entwürfe beginnen.</p>
          <Button variant="outline" disabled={sending} onClick={() => {
            setSending(true);
            void archiveCurrentDrafts().then(() => { setArchiveConfirm(false); setConflict(false); })
              .catch(error => toast.error(String(error))).finally(() => setSending(false));
          }}>Jetzt archivieren</Button>
        </AlertDescription></Alert>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Abbrechen
          </Button>
          <Button onClick={handleSend} disabled={total === 0 || !online || !session || sending || conflict || session?.role !== ROLES.OBSERVER}>
            <Send className="size-4" />
            {sending ? 'Senden…' : 'Senden'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

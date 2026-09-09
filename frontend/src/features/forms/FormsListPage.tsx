import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';
import { ClipboardList, Pencil, Plus, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { db } from '../../lib/db';
import { ROLES } from '../../config/constants';
import { useSessionStore } from '../../app/sessionStore';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { formsService } from '../../services/forms.service';
import { isFormAllowed } from '../../lib/access';

export function FormsListPage() {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const session = useSessionStore((s) => s.session);
  const isAdmin = session?.role === ROLES.ADMIN;
  const forms = useLiveQuery(() => db.forms.orderBy('name').toArray(), [], undefined);
  // Beobachter sehen nur ihre freigegebenen Formulare (allowed_forms); Admin alle.
  const visibleForms = useMemo(
    () => forms?.filter((f) => isFormAllowed(session, f.id)),
    [forms, session],
  );
  const [target, setTarget] = useState<{ id: number; name: string } | null>(null);

  const handleDelete = async () => {
    if (!target) return;
    try {
      await formsService.deleteForm(target.id);
      toast.success('Gelöscht', { description: `"${target.name}" wurde entfernt.` });
    } catch (err) {
      toast.error('Fehler', {
        description: err instanceof Error ? err.message : 'Löschen fehlgeschlagen.',
      });
    } finally {
      setTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Formulare"
        subtitle="Beobachtungsbögen ausfüllen"
        actions={
          isAdmin && (
            <Button disabled={!online} onClick={() => navigate('/forms/new')}>
              <Plus className="size-4" />
              Neues Formular
            </Button>
          )
        }
      />

      {visibleForms !== undefined && visibleForms.length === 0 && (
        <EmptyState
          icon={<ClipboardList />}
          title="Keine Formulare vorhanden"
          description="Bitte das Gerät vorbereiten, um Formulare zu laden."
        />
      )}

      <div className="space-y-3">
        {visibleForms?.map((form) => (
          <div
            key={form.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md"
          >
            <button
              type="button"
              onClick={() => navigate(`/forms/${form.id}`)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
                <ClipboardList className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold">{form.name}</p>
                {form.description_form && (
                  <p className="truncate text-sm text-muted-foreground">{form.description_form}</p>
                )}
              </div>
            </button>

            {isAdmin ? (
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!online}
                  onClick={() => navigate(`/forms/${form.id}/edit`)}
                  aria-label="Formular bearbeiten"
                >
                  <Pencil className="size-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!online}
                  onClick={() => setTarget({ id: form.id, name: form.name })}
                  aria-label="Formular löschen"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-5" />
                </Button>
              </div>
            ) : (
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      <AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Formular löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Formular "{target?.name}" wirklich dauerhaft löschen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Clock, Save, NotebookPen, Search, Users, WifiOff } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/PageHeader';
import { db } from '../../lib/db';
import { flushDrafts } from '../../lib/draftSaves';
import { ROUTES } from '../../config/constants';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useSessionStore } from '../../app/sessionStore';
import { canSeeProfiles } from '../../lib/access';
import { useFormFill } from './useFormFill';
import { QuestionCard } from './QuestionCard';
import { TimestampList } from './TimestampList';

export function FormFillPage() {
  const { formId: formIdParam } = useParams<{ formId: string }>();
  const formId = Number(formIdParam);
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const session = useSessionStore((s) => s.session);

  const cachedForm = useLiveQuery(async () => (await db.forms.get(formId)) ?? null, [formId], undefined);
  const fill = useFormFill(formId, cachedForm?.name ?? '');
  const form = fill.draft.formSnapshot ?? cachedForm;

  const [collapsedMap, setCollapsedMap] = useState<Record<number, boolean>>({});
  const [noteOpen, setNoteOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const questions = useMemo(() => form?.questions ?? [], [form?.questions]);

  const progress = useMemo(() => {
    if (questions.length === 0) return 0;
    const done = questions.filter((q) => fill.draft.completedQuestions[q.id]).length;
    return Math.round((done / questions.length) * 100);
  }, [questions, fill.draft.completedQuestions]);

  const toggleCollapse = (qid: number) => setCollapsedMap((m) => ({ ...m, [qid]: !m[qid] }));

  const runSearch = () => {
    const term = query.trim().toLowerCase();
    if (!term) return;
    let idx = -1;
    const num = term.match(/\d+/);
    if (num) {
      const n = Number(num[0]) - 1;
      if (n >= 0 && n < questions.length) idx = n;
    }
    if (idx === -1) {
      idx = questions.findIndex((q) => (q.question_text ?? '').toLowerCase().includes(term));
    }
    if (idx === -1) {
      toast.warning('Nicht gefunden', { description: 'Keine passende Frage.' });
      return;
    }
    const qid = questions[idx].id;
    setCollapsedMap((m) => ({ ...m, [qid]: false }));
    setSearchOpen(false);
    requestAnimationFrame(() => {
      cardRefs.current[qid]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  if (form === undefined || !fill.loaded) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (form === null) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Formular nicht gefunden. Bitte Gerät neu vorbereiten.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-5 pb-20">
      <PageHeader title={form.name} subtitle={form.description_form || undefined} />

      <div>
        <Progress value={progress} />
        <p className="mt-1 text-xs text-muted-foreground">{progress}% erledigt</p>
      </div>

      {!online && (
        <Alert>
          <WifiOff className="size-4" />
          <AlertDescription>Offline-Modus – Eingaben werden lokal gespeichert.</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {questions.map((q, idx) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={idx}
            fill={fill}
            collapsed={!!collapsedMap[q.id]}
            onToggleCollapse={() => toggleCollapse(q.id)}
            registerRef={(el) => {
              cardRefs.current[q.id] = el;
            }}
          />
        ))}
      </div>

      {/* Fixierte Toolbar – berücksichtigt Sidebar (md) und Bottom-Nav (mobil). */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 pt-2 pb-[calc(0.5rem_+_env(safe-area-inset-bottom))] backdrop-blur md:left-64">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
          <Button onClick={() => void flushDrafts().then(() => navigate(ROUTES.HOME)).catch(() => undefined)}>
            <Save className="size-4" />
            Speichern & zurück
          </Button>
          <div className="flex items-center gap-2">
            {form.show_patient_profile_search && canSeeProfiles(session) && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(ROUTES.PROFILES)}
                aria-label="Patientenprofil suchen"
              >
                <Users className="size-5" />
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={() => setNoteOpen(true)} aria-label="Notizen">
              <NotebookPen className="size-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setSearchOpen(true)} aria-label="Frage suchen">
              <Search className="size-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Notiz-Dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Notizen zum Formular</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              rows={5}
              placeholder="Notiz hier eingeben…"
              aria-label="Notizen zum Formular"
              value={fill.draft.note}
              onChange={(e) => fill.setNote(e.target.value)}
            />
            <Button variant="secondary" onClick={fill.addNoteTimestamp}>
              <Clock className="size-4" />
              Zeitstempel
            </Button>
            <TimestampList
              timestamps={fill.draft.noteTimestamps}
              onUpdate={fill.updateNoteTimestamp}
              onRemove={fill.removeNoteTimestamp}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Frage-Suche-Dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Frage suchen</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Nach Fragennummer oder Stichwort suchen.</p>
            <Input
              placeholder="Frage oder Nummer eingeben"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            />
            <Button onClick={runSearch} className="w-full">
              Suchen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

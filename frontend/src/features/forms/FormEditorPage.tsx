import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/PageHeader';
import { ROUTES } from '../../config/constants';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useFormEditor } from './useFormEditor';
import { QuestionEditor } from './QuestionEditor';

export function FormEditorPage() {
  const { formId: formIdParam } = useParams<{ formId: string }>();
  const formId = formIdParam ? Number(formIdParam) : null;
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const editor = useFormEditor(formId);

  const handleSubmit = async () => {
    if (!online) {
      toast.warning('Keine Internetverbindung', {
        description: 'Formulare können nur online gespeichert werden.',
      });
      return;
    }
    try {
      await editor.submit();
      toast.success('Gespeichert', { description: 'Das Formular wurde erfolgreich hochgeladen.' });
      navigate(ROUTES.FORMS);
    } catch (err) {
      toast.error('Fehler', {
        description: err instanceof Error ? err.message : 'Speichern fehlgeschlagen.',
      });
    }
  };

  if (editor.loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={editor.isEdit ? 'Formular bearbeiten' : 'Neues Formular'} />

      <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="space-y-1.5">
          <Label htmlFor="formName">
            Formularname <span className="text-destructive">*</span>
          </Label>
          <Input
            id="formName"
            value={editor.formName}
            onChange={(e) => editor.setFormName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="formDesc">Beschreibung</Label>
          <Textarea
            id="formDesc"
            rows={2}
            value={editor.formDescription}
            onChange={(e) => editor.setFormDescription(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2.5 text-sm">
          <Switch
            checked={editor.showPatientProfileSearch}
            onCheckedChange={(c) => editor.setShowPatientProfileSearch(c)}
          />
          Patientenprofil-Suche im Formular anzeigen
        </label>
      </div>

      <h2 className="text-lg font-bold">Fragen</h2>
      <div className="space-y-4">
        {editor.questions.map((q, idx) => (
          <QuestionEditor
            key={q.id}
            question={q}
            index={idx}
            canDelete={editor.questions.length > 1}
            onPatch={(patch) => editor.patchQuestion(q.id, patch)}
            onDelete={() => editor.deleteQuestion(q.id)}
            onSetOptionType={(type) => editor.setOptionType(q.id, type)}
            onAddOption={(type) => editor.addOption(q.id, type)}
            onChangeOptionLabel={(optId, label) => editor.changeOptionLabel(q.id, optId, label)}
            onDeleteOption={(optId) => editor.deleteOption(q.id, optId)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={editor.addQuestion}>
          <Plus className="size-4" />
          Frage hinzufügen
        </Button>
        <Button disabled={editor.saving} onClick={() => void handleSubmit()}>
          <Save className="size-4" />
          {editor.saving ? 'Speichern…' : 'Speichern'}
        </Button>
      </div>
    </div>
  );
}

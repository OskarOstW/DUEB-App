import { Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Segmented } from '@/components/Segmented';
import type { EditorOptionType, EditorQuestion } from './useFormEditor';

interface QuestionEditorProps {
  question: EditorQuestion;
  index: number;
  onPatch: (patch: Partial<EditorQuestion>) => void;
  onDelete: () => void;
  onSetOptionType: (type: EditorOptionType) => void;
  onAddOption: (type: 'checkbox' | 'dropdown') => void;
  onChangeOptionLabel: (optionId: string, label: string) => void;
  onDeleteOption: (optionId: string) => void;
  canDelete: boolean;
}

export function QuestionEditor({
  question,
  index,
  onPatch,
  onDelete,
  onSetOptionType,
  onAddOption,
  onChangeOptionLabel,
  onDeleteOption,
  canDelete,
}: QuestionEditorProps) {
  const hasOptions = question.optionType === 'checkbox' || question.optionType === 'dropdown';

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <span className="rounded-md bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
          Frage {index + 1}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={!canDelete}
          onClick={onDelete}
          aria-label="Frage löschen"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`q-${question.id}`}>Fragetext</Label>
        <Input
          id={`q-${question.id}`}
          required
          value={question.question}
          onChange={(e) => onPatch({ question: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Zusatzinformation</Label>
        <Textarea
          rows={1}
          aria-label="Zusatzinformation"
          value={question.additionalInfo}
          onChange={(e) => onPatch({ additionalInfo: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Hinweis aus dem KAP</Label>
        <Textarea aria-label="Hinweis aus dem KAP" rows={1} value={question.hint} onChange={(e) => onPatch({ hint: e.target.value })} />
      </div>

      <div className="space-y-1.5">
        <Label>Antworttyp</Label>
        <Segmented
          value={question.optionType}
          onChange={(v) => onSetOptionType(v as EditorOptionType)}
          options={[
            { value: 'none', label: 'Keine' },
            { value: 'checkbox', label: 'Checkbox' },
            { value: 'dropdown', label: 'Dropdown' },
            { value: 'scale', label: 'Skala' },
          ]}
        />
      </div>

      {hasOptions && (
        <div className="space-y-2">
          {question.options.map((o, i) => (
            <div key={o.id} className="flex items-center gap-2">
              <Input
                className="flex-1"
                placeholder={`Option ${i + 1}`}
                value={o.label}
                onChange={(e) => onChangeOptionLabel(o.id, e.target.value)}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onDeleteOption(o.id)}
                aria-label="Option löschen"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onAddOption(question.optionType as 'checkbox' | 'dropdown')}
          >
            <Plus className="size-4" />
            Option hinzufügen
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={question.inputFieldAdded}
            onCheckedChange={(c) => onPatch({ inputFieldAdded: c })}
          />
          Texteingabefeld
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={question.imageAdded} onCheckedChange={(c) => onPatch({ imageAdded: c })} />
          Bild-Upload
        </label>
      </div>
    </Card>
  );
}

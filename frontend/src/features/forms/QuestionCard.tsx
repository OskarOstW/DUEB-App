import { Lightbulb, Check, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Question } from '../../types';
import type { useFormFill } from './useFormFill';
import { QuestionImages } from './QuestionImages';
import { TimestampList } from './TimestampList';

interface QuestionCardProps {
  question: Question;
  index: number;
  fill: ReturnType<typeof useFormFill>;
  collapsed: boolean;
  onToggleCollapse: () => void;
  registerRef: (el: HTMLDivElement | null) => void;
}

export function QuestionCard({
  question,
  index,
  fill,
  collapsed,
  onToggleCollapse,
  registerRef,
}: QuestionCardProps) {
  const { draft } = fill;
  const qid = question.id;
  const completed = !!draft.completedQuestions[qid];
  const images = fill.imagesByQuestion[qid] ?? [];

  const isAnswered = (() => {
    if (question.option_type === 'checkbox') {
      return question.options.some((o) => !!draft.responses[`${qid}_${o.id}`]);
    }
    if (question.option_type === 'scale') return draft.scaleValues[qid] !== undefined;
    if (question.option_type === 'dropdown') return !!draft.pickerSelections[qid];
    if (question.input_field_added) return !!draft.responses[qid];
    return false;
  })();

  return (
    <Card ref={registerRef} className="p-4">
      <div
        className="flex cursor-pointer items-start justify-between gap-3"
        onClick={onToggleCollapse}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            {index + 1}
          </span>
          <p
            className={cn(
              'font-medium',
              completed && 'text-muted-foreground',
              collapsed && 'line-clamp-2',
            )}
          >
            {question.question_text}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {collapsed && isAnswered && <span className="size-2 rounded-full bg-status-online" />}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fill.toggleCompleted(qid);
            }}
            aria-label="Erledigt umschalten"
            className={cn(
              'flex size-7 items-center justify-center rounded-full border transition-colors',
              completed
                ? 'border-status-online bg-status-online text-white'
                : 'border-input text-transparent hover:bg-secondary',
            )}
          >
            <Check className="size-4" />
          </button>
          {collapsed ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="size-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {!collapsed && (
        <div className={cn('mt-3 space-y-3', completed && 'opacity-60')}>
          {question.description_question && (
            <p className="text-sm text-muted-foreground">{question.description_question}</p>
          )}

          {question.hint && (
            <div className="flex items-start gap-2 rounded-lg bg-warning/10 p-2.5 text-sm">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" />
              <span>{question.hint}</span>
            </div>
          )}

          {question.option_type === 'checkbox' && (
            <div className="space-y-2">
              {question.options.map((o) => (
                <label key={o.id} className="flex items-center gap-2.5 text-sm">
                  <Checkbox
                    disabled={completed}
                    checked={!!draft.responses[`${qid}_${o.id}`]}
                    onCheckedChange={(c) => fill.setCheckbox(qid, o.id, c === true)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          )}

          {question.option_type === 'scale' && (
            <div className="px-1 pt-2">
              <Slider
                min={0}
                max={10}
                step={1}
                disabled={completed}
                value={[draft.scaleValues[qid] ?? 5]}
                onValueChange={(v) => fill.setScale(qid, v[0])}
              />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span className="font-semibold text-foreground">{draft.scaleValues[qid] ?? 5}</span>
                <span>10</span>
              </div>
            </div>
          )}

          {question.option_type === 'dropdown' && (
            <Select
              value={draft.pickerSelections[qid] || undefined}
              disabled={completed}
              onValueChange={(val) => fill.setPicker(qid, val ?? '')}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Auswählen…" />
              </SelectTrigger>
              <SelectContent>
                {question.options.map((o) => (
                  <SelectItem key={o.id} value={o.label}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {question.input_field_added && (
            <Textarea
              rows={3}
              placeholder="Antwort eingeben…"
              disabled={completed}
              aria-label={question.question_text || 'Antwort'}
              value={(draft.responses[qid] as string) ?? ''}
              onChange={(e) => fill.setText(qid, e.target.value)}
            />
          )}

          <div>
            <Button
              variant="outline"
              size="icon"
              disabled={completed}
              onClick={() => fill.addTimestamp(qid)}
              aria-label="Zeitstempel hinzufügen"
            >
              <Clock className="size-5" />
            </Button>
          </div>

          {question.image_upload_desired && (
            <QuestionImages
              images={images}
              disabled={completed}
              onAdd={(blob) => fill.addImage(qid, blob)}
              onRename={fill.renameImage}
              onRemove={fill.removeImage}
            />
          )}

          <TimestampList
            timestamps={draft.timestamps[qid] ?? []}
            onUpdate={(tsId, patch) => fill.updateTimestamp(qid, tsId, patch)}
            onRemove={(tsId) => fill.removeTimestamp(qid, tsId)}
          />
        </div>
      )}
    </Card>
  );
}

import { toast } from 'sonner';
import { useDraftAutosave } from '../../hooks/useDraftAutosave';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type StoredImage } from '../../lib/db';
import { formResponsesRepo } from '../../services/repos/formResponses.repo';
import { imagesRepo, ImageLimitError } from '../../services/repos/images.repo';
import type { FormResponseDraft, TimestampEntry } from '../../types';
import { createTimestamp } from './timestamps';

/** Stabiler Leer-Entwurf, bis die echten Daten aus Dexie geladen sind. */
const placeholder = (formId: number, formName: string): FormResponseDraft => ({
  formId,
  formName,
  responses: {},
  pickerSelections: {},
  scaleValues: {},
  timestamps: {},
  note: '',
  noteTimestamps: [],
  completedQuestions: {},
  updatedAt: new Date().toISOString(),
});

export function useFormFill(formId: number, formName: string) {
  const [store] = useState(() => db);
  const { draft, saving, flush, replace, mutate, latest } = useDraftAutosave(
    placeholder(formId, formName), value => formResponsesRepo.save(value, store));
  const [loadedFormId, setLoadedFormId] = useState<number | null>(null);
  const loaded = loadedFormId === formId;

  // Bilder reaktiv aus Dexie (Source of Truth, getrennt vom Antwort-Entwurf).
  const images = useLiveQuery(
    () => imagesRepo.forForm(formId),
    [formId],
    [],
  );

  useEffect(() => {
    let active = true;
    if (latest.current.formId === formId && latest.current.formSnapshot) return;
    flush().then(() => formResponsesRepo.getOrCreate(formId, formName)).then((d) => {
      if (active) {
        replace(d);
        setLoadedFormId(formId);
      }
    }).catch(() => toast.error('Entwurf konnte nicht geladen werden.'));
    return () => {
      active = false;
    };
  }, [formId, formName, flush, replace, latest]);

  // ---- Antwort-Setter ----
  const setText = useCallback(
    (questionId: number, value: string) =>
      mutate((p) => ({ ...p, responses: { ...p.responses, [questionId]: value } })),
    [mutate],
  );

  const setCheckbox = useCallback(
    (questionId: number, optionId: number, checked: boolean) =>
      mutate((p) => ({
        ...p,
        responses: { ...p.responses, [`${questionId}_${optionId}`]: checked },
      })),
    [mutate],
  );

  const setPicker = useCallback(
    (questionId: number, label: string) =>
      mutate((p) => ({ ...p, pickerSelections: { ...p.pickerSelections, [questionId]: label } })),
    [mutate],
  );

  const setScale = useCallback(
    (questionId: number, value: number) =>
      mutate((p) => ({ ...p, scaleValues: { ...p.scaleValues, [questionId]: value } })),
    [mutate],
  );

  const toggleCompleted = useCallback(
    (questionId: number) =>
      mutate((p) => ({
        ...p,
        completedQuestions: {
          ...p.completedQuestions,
          [questionId]: !p.completedQuestions[questionId],
        },
      })),
    [mutate],
  );

  const setNote = useCallback(
    (text: string) => mutate((p) => ({ ...p, note: text })),
    [mutate],
  );

  // ---- Frage-Zeitstempel ----
  const addTimestamp = useCallback(
    (questionId: number) =>
      mutate((p) => ({
        ...p,
        timestamps: {
          ...p.timestamps,
          [questionId]: [...(p.timestamps[questionId] ?? []), createTimestamp()],
        },
      })),
    [mutate],
  );

  const updateTimestamp = useCallback(
    (questionId: number, tsId: string, patch: Partial<TimestampEntry>) =>
      mutate((p) => ({
        ...p,
        timestamps: {
          ...p.timestamps,
          [questionId]: (p.timestamps[questionId] ?? []).map((ts) =>
            ts.id === tsId ? { ...ts, ...patch } : ts,
          ),
        },
      })),
    [mutate],
  );

  const removeTimestamp = useCallback(
    (questionId: number, tsId: string) =>
      mutate((p) => ({
        ...p,
        timestamps: {
          ...p.timestamps,
          [questionId]: (p.timestamps[questionId] ?? []).filter((ts) => ts.id !== tsId),
        },
      })),
    [mutate],
  );

  // ---- Notiz-Zeitstempel ----
  const addNoteTimestamp = useCallback(
    () => mutate((p) => ({ ...p, noteTimestamps: [...p.noteTimestamps, createTimestamp()] })),
    [mutate],
  );

  const updateNoteTimestamp = useCallback(
    (tsId: string, patch: Partial<TimestampEntry>) =>
      mutate((p) => ({
        ...p,
        noteTimestamps: p.noteTimestamps.map((ts) =>
          ts.id === tsId ? { ...ts, ...patch } : ts,
        ),
      })),
    [mutate],
  );

  const removeNoteTimestamp = useCallback(
    (tsId: string) =>
      mutate((p) => ({ ...p, noteTimestamps: p.noteTimestamps.filter((ts) => ts.id !== tsId) })),
    [mutate],
  );

  // ---- Bilder (über Dexie-Repo, Limit pro Formular) ----
  const addImage = async (questionId: number, blob: Blob): Promise<boolean> => {
      try {
        await flush();
        const imageDraft = latest.current.formId === formId ? latest.current : await formResponsesRepo.getOrCreate(formId, formName);
        await imagesRepo.add(formId, questionId, blob, '', imageDraft);
        return true;
      } catch (err) {
        if (err instanceof ImageLimitError) return false;
        throw err;
      }
  };

  const renameImage = useCallback(
    (id: string, name: string) => imagesRepo.updateName(id, name),
    [],
  );

  const removeImage = useCallback((id: string) => imagesRepo.delete(id), []);

  const imagesByQuestion = useMemo(() => {
    const map: Record<number, StoredImage[]> = {};
    for (const img of images ?? []) {
      (map[img.questionId] ??= []).push(img);
    }
    return map;
  }, [images]);

  const imageCount = images?.length ?? 0;

  return {
    draft,
    loaded,
    saving,
    flush,
    imagesByQuestion,
    imageCount,
    setText,
    setCheckbox,
    setPicker,
    setScale,
    toggleCompleted,
    setNote,
    addTimestamp,
    updateTimestamp,
    removeTimestamp,
    addNoteTimestamp,
    updateNoteTimestamp,
    removeNoteTimestamp,
    addImage,
    renameImage,
    removeImage,
  };
}

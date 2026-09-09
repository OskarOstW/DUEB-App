import { useCallback, useEffect, useState } from 'react';
import { db } from '../../lib/db';
import { formsService, type FormSavePayload } from '../../services/forms.service';

export type EditorOptionType = 'none' | 'checkbox' | 'dropdown' | 'scale';

export interface EditorOption {
  id: string;
  label: string;
}

export interface EditorQuestion {
  id: string;
  question: string;
  additionalInfo: string;
  hint: string;
  options: EditorOption[];
  optionType: EditorOptionType;
  inputFieldAdded: boolean;
  imageAdded: boolean;
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const emptyQuestion = (): EditorQuestion => ({
  id: uid(),
  question: '',
  additionalInfo: '',
  hint: '',
  options: [],
  optionType: 'none',
  inputFieldAdded: false,
  imageAdded: false,
});

const emptyOption = (): EditorOption => ({ id: uid(), label: '' });

export function useFormEditor(formId: number | null) {
  const isEdit = formId !== null;
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [showPatientProfileSearch, setShowPatientProfileSearch] = useState(false);
  const [questions, setQuestions] = useState<EditorQuestion[]>([emptyQuestion()]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // Edit-Modus: aus dem lokalen Snapshot laden (device-prep hat Formulare gespiegelt).
  useEffect(() => {
    if (formId === null) return;
    let active = true;
    db.forms.get(formId).then((form) => {
      if (!active || !form) {
        if (active) setLoading(false);
        return;
      }
      setFormName(form.name);
      setFormDescription(form.description_form ?? '');
      setShowPatientProfileSearch(form.show_patient_profile_search);
      setQuestions(
        form.questions.map((q) => ({
          id: String(q.id),
          question: q.question_text ?? '',
          additionalInfo: q.description_question ?? '',
          hint: q.hint ?? '',
          options: q.options.map((o) => ({ id: String(o.id), label: o.label })),
          optionType: q.option_type as EditorOptionType,
          inputFieldAdded: q.input_field_added,
          imageAdded: q.image_upload_desired,
        })),
      );
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [formId]);

  const patchQuestion = useCallback(
    (id: string, patch: Partial<EditorQuestion>) =>
      setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q))),
    [],
  );

  const addQuestion = useCallback(() => setQuestions((prev) => [...prev, emptyQuestion()]), []);
  const deleteQuestion = useCallback(
    (id: string) => setQuestions((prev) => prev.filter((q) => q.id !== id)),
    [],
  );

  const addOption = useCallback((questionId: string, type: 'checkbox' | 'dropdown') => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, options: [...q.options, emptyOption()], optionType: type }
          : q,
      ),
    );
  }, []);

  const changeOptionLabel = useCallback((questionId: string, optionId: string, label: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.map((o) => (o.id === optionId ? { ...o, label } : o)) }
          : q,
      ),
    );
  }, []);

  const deleteOption = useCallback((questionId: string, optionId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const options = q.options.filter((o) => o.id !== optionId);
        return { ...q, options, optionType: options.length > 0 ? q.optionType : 'none' };
      }),
    );
  }, []);

  const setOptionType = useCallback((id: string, type: EditorOptionType) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        if (type === 'checkbox' || type === 'dropdown') {
          const options = q.options.length > 0 ? q.options : [emptyOption()];
          return { ...q, optionType: type, options };
        }
        return { ...q, optionType: type, options: [] };
      }),
    );
  }, []);

  const validate = useCallback((): string | null => {
    if (!formName.trim()) return 'Formularname ist erforderlich.';
    for (const q of questions) {
      if (!q.question.trim()) return 'Jede Frage muss ausgefüllt sein.';
      if (q.optionType !== 'none' && q.optionType !== 'scale') {
        if (q.options.some((o) => !o.label.trim())) return 'Alle Optionen müssen ausgefüllt sein.';
      }
    }
    return null;
  }, [formName, questions]);

  const buildPayload = useCallback(
    (): FormSavePayload => ({
      name: formName,
      description_form: formDescription,
      show_patient_profile_search: showPatientProfileSearch,
      questions: questions.map((q) => ({
        ...(Number.isInteger(Number(q.id)) ? { id: Number(q.id) } : {}),
        question_text: q.question,
        description_question: q.additionalInfo,
        hint: q.hint,
        option_type: q.optionType,
        input_field_added: q.inputFieldAdded,
        image_upload_desired: q.imageAdded,
        options: q.options.map((o) => ({ ...(Number.isInteger(Number(o.id)) ? { id: Number(o.id) } : {}), label: o.label })),
      })),
    }),
    [formName, formDescription, showPatientProfileSearch, questions],
  );

  /** Validiert + speichert. Wirft bei Fehler; gibt true bei Erfolg zurück. */
  const submit = useCallback(async (): Promise<void> => {
    const error = validate();
    if (error) throw new Error(error);
    setSaving(true);
    try {
      const payload = buildPayload();
      if (formId === null) await formsService.createForm(payload);
      else await formsService.replaceForm(formId, payload);
    } finally {
      setSaving(false);
    }
  }, [validate, buildPayload, formId]);

  return {
    isEdit,
    formName,
    setFormName,
    formDescription,
    setFormDescription,
    showPatientProfileSearch,
    setShowPatientProfileSearch,
    questions,
    loading,
    saving,
    addQuestion,
    deleteQuestion,
    patchQuestion,
    addOption,
    changeOptionLabel,
    deleteOption,
    setOptionType,
    submit,
  };
}

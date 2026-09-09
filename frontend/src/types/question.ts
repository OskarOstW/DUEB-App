/** Antworttyp einer Frage (Backend: Question.option_type). */
export type OptionType = 'none' | 'checkbox' | 'dropdown' | 'scale' | 'image';

export interface Option {
  id: number;
  label: string;
}

export interface Question {
  id: number;
  form?: number;
  question_text: string | null;
  option_type: OptionType;
  input_field_added: boolean;
  image_upload_desired: boolean;
  description_question: string | null;
  hint: string | null;
  options: Option[];
}

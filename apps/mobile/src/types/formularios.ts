export type FormQuestionType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'date'
  | 'rubros_agricolas'
  | 'produccion_animal';

export type FormQuestionSelectionMode = 'single' | 'multiple';

export interface FormQuestionOption {
  label: string;
  value: string;
}

export interface QuestionDependency {
  question_id: string;
  value: string;
}

export interface RubroAgricolaItem {
  rubro: string;
  superficie_m2: number;
}

export interface ProduccionAnimalItem {
  especie: string;
  hembras: number;
  machos: number;
  crias: number;
  espacio_productivo_m2: number;
}

export interface FormQuestion {
  id: string;
  label: string;
  type: FormQuestionType;
  required: boolean;
  useAsFilter?: boolean | undefined;
  placeholder?: string | undefined;
  options: FormQuestionOption[];
  selectionMode?: FormQuestionSelectionMode | undefined;
  isBaseSurface?: boolean | undefined;
  depends_on?: QuestionDependency | undefined;
}

export interface FormStructure {
  preguntas: FormQuestion[];
}

export interface SubmitFormularioRespuestaPayload {
  campesino_id?: string | undefined;
  encuestador_id?: string | undefined;
  respuestas: Record<string, unknown>;
  metadata?: Record<string, unknown> | undefined;
  capturado_en?: string | undefined;
}

export interface CampesinoMetadataNormalized {
  formularios_respondidos: string[];
  [key: string]: unknown;
}

export interface QueuedFormularioSubmission {
  campesinoId: string;
  formularioId: string;
  formularioTitulo: string;
  respuestas: Record<string, unknown>;
  allActiveFormIds: string[];
  encuestadorId?: string | undefined;
  capturedAtIso: string;
}

export interface SubmissionHistoryItem {
  id: string;
  campesinoId: string;
  formularioId: string;
  formularioTitulo: string;
  status: 'enviado' | 'pendiente_offline' | 'sincronizado' | 'error';
  message: string;
  createdAt: number;
}

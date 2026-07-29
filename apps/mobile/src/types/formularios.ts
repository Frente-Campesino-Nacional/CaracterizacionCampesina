export type FormQuestionType = 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'date';

export type FormQuestionSelectionMode = 'single' | 'multiple';

export interface FormQuestionOption {
  label: string;
  value: string;
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

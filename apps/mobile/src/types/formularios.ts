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
  placeholder?: string | undefined;
  options: FormQuestionOption[];
  selectionMode?: FormQuestionSelectionMode | undefined;
}

export interface FormStructure {
  preguntas: FormQuestion[];
}

export interface SubmitFormularioRespuestaPayload {
  campesino_id?: number | undefined;
  encuestador_id?: number | undefined;
  respuestas: Record<string, unknown>;
  metadata?: Record<string, unknown> | undefined;
  capturado_en?: string | undefined;
}

export interface CampesinoMetadataNormalized {
  formularios_respondidos: number[];
  [key: string]: unknown;
}

export interface QueuedFormularioSubmission {
  campesinoId: number;
  formularioId: number;
  formularioTitulo: string;
  respuestas: Record<string, unknown>;
  allActiveFormIds: number[];
  encuestadorId?: number | undefined;
  capturedAtIso: string;
}

export interface SubmissionHistoryItem {
  id: string;
  campesinoId: number;
  formularioId: number;
  formularioTitulo: string;
  status: 'enviado' | 'pendiente_offline' | 'sincronizado' | 'error';
  message: string;
  createdAt: number;
}

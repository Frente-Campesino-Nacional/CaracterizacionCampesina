export type FormQuestionType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'date'
  | 'rubros_agricolas'
  | 'produccion_animal'
  | 'carga_familiar';

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

export interface CargaFamiliarItem {
  grupo: string;
  label: string;
  rango_edad: string;
  femenino: number;
  masculino: number;
}

export const DEFAULT_CARGA_FAMILIAR_GRUPOS: Array<{
  grupo: string;
  label: string;
  rango_edad: string;
  descripcion: string;
}> = [
  {
    grupo: 'adulto_mayor',
    label: 'Adulto Mayor',
    rango_edad: 'Fem. ≥ 55 años | Masc. ≥ 60 años',
    descripcion: 'Femeninas a partir de los 55 años y masculinos a partir de los 60 años',
  },
  {
    grupo: 'adulto',
    label: 'Adulto',
    rango_edad: 'Fem. 18 a 54 años | Masc. 18 a 59 años',
    descripcion: 'Femeninas de 18 hasta 54 años y masculinos de 18 hasta 59 años',
  },
  {
    grupo: 'adolescente',
    label: 'Adolescente',
    rango_edad: '12 a 17 años',
    descripcion: 'Femeninas y masculinos desde los 12 hasta los 17 años',
  },
  {
    grupo: 'menor',
    label: 'Menor',
    rango_edad: '4 a 11 años',
    descripcion: 'Femeninas y masculinos desde los 4 hasta los 11 años',
  },
  {
    grupo: 'infante',
    label: 'Infante',
    rango_edad: '0 a 3 años',
    descripcion: 'Femeninas y masculinos desde los 0 hasta los 3 años de edad',
  },
];

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
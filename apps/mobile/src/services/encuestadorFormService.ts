import axios from 'axios';
import {
  CampesinoRecord,
  FormularioRecord,
  listCampesinos,
  listFormularios,
  submitFormularioRespuesta,
} from './adminService';
import {
  CampesinoMetadataNormalized,
  FormQuestion,
  FormQuestionOption,
  FormStructure,
  QueuedFormularioSubmission,
  SubmissionHistoryItem,
  SubmitFormularioRespuestaPayload,
} from '../types/formularios';
import {
  addSubmissionHistory,
  clearDraft,
  deleteQueuedSubmission,
  enqueueSubmission as enqueueSubmissionDb,
  getDraft,
  getSubmissionHistoryByCampesino as getSubmissionHistoryByCampesinoDb,
  listQueuedSubmissions,
  saveDraft,
} from '../database/sync/formOfflineRepository';

export function normalizeMetadata(metadata: Record<string, unknown> | null | undefined): CampesinoMetadataNormalized {
  if (!metadata || Array.isArray(metadata)) {
    return { formularios_respondidos: [] };
  }

  const raw = metadata.formularios_respondidos;
  const ids = Array.isArray(raw)
    ? raw
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0)
    : [];

  return {
    ...metadata,
    formularios_respondidos: Array.from(new Set(ids)),
  };
}

export function getPreguntasFromStructure(estructura: Record<string, unknown>): FormQuestion[] {
  const raw = estructura.preguntas;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((question, index) => {
      if (!question || typeof question !== 'object' || Array.isArray(question)) {
        return null;
      }

      const item = question as Record<string, unknown>;
      const rawId = item.id ?? item.key ?? item.name ?? `pregunta_${index + 1}`;
      const rawLabel = item.label ?? item.etiqueta ?? item.titulo ?? `Pregunta ${index + 1}`;
      const rawType = item.type ?? item.tipo ?? 'text';
      const rawRequired = item.required ?? item.requerida ?? false;
      const rawSelectionMode = item.selectionMode ?? item.modoSeleccion ?? item.tipoSeleccion ?? item.multiple;

      const normalizedType = String(rawType).toLowerCase();
      const allowedTypes = new Set(['text', 'textarea', 'number', 'boolean', 'select', 'date']);
      const type = allowedTypes.has(normalizedType) ? normalizedType : 'text';
      const selectionMode = type === 'select'
        ? normalizeSelectionMode(rawSelectionMode)
        : undefined;

      const options = parseQuestionOptions(item.options ?? item.opciones);

      return {
        id: String(rawId),
        label: String(rawLabel),
        type,
        required: Boolean(rawRequired),
        placeholder: item.placeholder ? String(item.placeholder) : undefined,
        options,
        selectionMode,
      } as FormQuestion;
    })
    .filter((question): question is FormQuestion => Boolean(question));
}

function parseQuestionOptions(value: unknown): FormQuestionOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((option) => {
      if (typeof option === 'string' || typeof option === 'number') {
        const text = String(option);
        return { label: text, value: text };
      }

      if (option && typeof option === 'object' && !Array.isArray(option)) {
        const record = option as Record<string, unknown>;
        const label = record.label ?? record.nombre ?? record.text;
        const optionValue = record.value ?? record.id ?? label;
        if (label == null || optionValue == null) {
          return null;
        }
        return {
          label: String(label),
          value: String(optionValue),
        };
      }

      return null;
    })
    .filter((option): option is FormQuestionOption => Boolean(option));
}

function normalizeSelectionMode(value: unknown): 'single' | 'multiple' {
  if (typeof value === 'boolean') {
    return value ? 'multiple' : 'single';
  }

  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'multiple' || normalized === 'multi' || normalized === 'multiple_select') {
    return 'multiple';
  }

  return 'single';
}

export function buildDefaultAnswers(questions: FormQuestion[]): Record<string, unknown> {
  return questions.reduce<Record<string, unknown>>((acc, question) => {
    if (question.type === 'boolean') {
      acc[question.id] = false;
      return acc;
    }

    if (question.type === 'select' && question.selectionMode === 'multiple') {
      acc[question.id] = [];
      return acc;
    }

    acc[question.id] = '';
    return acc;
  }, {});
}

export function validateAnswers(
  questions: FormQuestion[],
  answers: Record<string, unknown>,
): string | null {
  for (const question of questions) {
    if (!question.required) {
      continue;
    }

    const value = answers[question.id];
    if (question.type === 'boolean') {
      if (value !== true) {
        return `Debes completar: ${question.label}`;
      }
      continue;
    }

    if (question.type === 'select' && question.selectionMode === 'multiple') {
      if (!Array.isArray(value) || value.length === 0) {
        return `Debes completar: ${question.label}`;
      }
      continue;
    }

    const normalized = String(value ?? '').trim();
    if (!normalized) {
      return `Debes completar: ${question.label}`;
    }
  }

  return null;
}

export async function getCampesinoById(token: string, campesinoId: number): Promise<CampesinoRecord | null> {
  const all = await listCampesinos(token);
  return all.find((item) => item.id === campesinoId) || null;
}

export async function getFormularioById(token: string, formularioId: number): Promise<FormularioRecord | null> {
  const all = await listFormularios(token);
  return all.find((item) => item.id === formularioId) || null;
}

export async function getFormulariosActivos(token: string): Promise<FormularioRecord[]> {
  const all = await listFormularios(token);
  return all.filter((item) => item.activo);
}

export function getPendingFormularios(
  formulariosActivos: FormularioRecord[],
  metadata: Record<string, unknown> | null | undefined,
): FormularioRecord[] {
  const normalizedMetadata = normalizeMetadata(metadata);
  const completedIds = new Set(normalizedMetadata.formularios_respondidos);
  return formulariosActivos.filter((item) => !completedIds.has(item.id));
}

export async function submitAndMarkFormulario(
  token: string,
  payload: SubmitFormularioRespuestaPayload,
  campesinoId: number,
  formularioId: number,
  allActiveFormIds: number[],
  formularioTitulo: string,
): Promise<void> {
  await submitFormularioRespuesta(token, formularioId, payload);

  await addSubmissionHistory({
    campesinoId,
    formularioId,
    formularioTitulo,
    status: 'enviado',
    message: 'Formulario enviado al backend correctamente.',
  });
}

export async function enqueueSubmission(item: QueuedFormularioSubmission): Promise<void> {
  await enqueueSubmissionDb({
    campesinoId: item.campesinoId,
    formularioId: item.formularioId,
    formularioTitulo: item.formularioTitulo,
    respuestas: item.respuestas,
    allActiveFormIds: item.allActiveFormIds,
    encuestadorId: item.encuestadorId,
    capturedAtIso: item.capturedAtIso,
  });

  await addSubmissionHistory({
    campesinoId: item.campesinoId,
    formularioId: item.formularioId,
    formularioTitulo: item.formularioTitulo,
    status: 'pendiente_offline',
    message: 'Guardado offline. Se enviará cuando haya conexión.',
  });
}

export async function flushQueuedSubmissions(token: string): Promise<number> {
  const queue = await listQueuedSubmissions();
  if (!queue.length) {
    return 0;
  }
  let flushed = 0;

  for (const entry of queue) {
    try {
      await submitAndMarkFormulario(
        token,
        {
          campesino_id: entry.campesinoId,
          encuestador_id: entry.encuestadorId,
          respuestas: entry.respuestas,
          metadata: { queued: true, queued_at: entry.capturedAtIso },
          capturado_en: entry.capturedAtIso,
        },
        entry.campesinoId,
        entry.formularioId,
        entry.allActiveFormIds,
        entry.formularioTitulo,
      );
      await deleteQueuedSubmission(entry.id);
      await addSubmissionHistory({
        campesinoId: entry.campesinoId,
        formularioId: entry.formularioId,
        formularioTitulo: entry.formularioTitulo,
        status: 'sincronizado',
        message: 'Respuesta offline sincronizada.',
      });
      flushed += 1;
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        continue;
      }
      await addSubmissionHistory({
        campesinoId: entry.campesinoId,
        formularioId: entry.formularioId,
        formularioTitulo: entry.formularioTitulo,
        status: 'error',
        message: 'Error al sincronizar la respuesta.',
      });
    }
  }
  return flushed;
}

export async function getDraftAnswers(
  campesinoId: number,
  formularioId: number,
): Promise<Record<string, unknown> | null> {
  return getDraft(campesinoId, formularioId);
}

export async function saveDraftAnswers(
  campesinoId: number,
  formularioId: number,
  answers: Record<string, unknown>,
): Promise<void> {
  await saveDraft(campesinoId, formularioId, answers);
}

export async function clearDraftAnswers(campesinoId: number, formularioId: number): Promise<void> {
  await clearDraft(campesinoId, formularioId);
}

export async function getSubmissionHistoryByCampesino(
  campesinoId: number,
): Promise<SubmissionHistoryItem[]> {
  return getSubmissionHistoryByCampesinoDb(campesinoId);
}

export function parseFormStructure(estructura: Record<string, unknown>): FormStructure {
  const preguntas = getPreguntasFromStructure(estructura);
  return { preguntas };
}

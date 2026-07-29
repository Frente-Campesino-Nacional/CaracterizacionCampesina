import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { getCachedCampesinoById } from './encuestadorCampesinoOfflineService';
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

const STORAGE_KEYS = {
  formulariosActivos: 'encuestador-formularios-activos-cache-v1',
  campesinoMetadata: 'encuestador-campesino-metadata-cache-v1',
};

type CampesinoMetadataCache = Record<string, Record<string, unknown>>;

export function normalizeMetadata(metadata: Record<string, unknown> | null | undefined): CampesinoMetadataNormalized {
  if (!metadata || Array.isArray(metadata)) {
    return { formularios_respondidos: [] };
  }

  const raw = metadata.formularios_respondidos;
  const ids = Array.isArray(raw)
    ? raw
        .map((item) => String(item).trim())
        .filter((item) => item.length > 0)
    : typeof raw === 'string'
      ? raw
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      : [];

  return {
    ...metadata,
    formularios_respondidos: Array.from(new Set(ids)),
  };
}

function mergeMetadataSources(
  baseMetadata: Record<string, unknown> | null | undefined,
  localMetadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const merged = {
    ...(baseMetadata ?? {}),
    ...(localMetadata ?? {}),
  } as Record<string, unknown>;

  const ids = Array.from(new Set([
    ...normalizeMetadata(baseMetadata).formularios_respondidos,
    ...normalizeMetadata(localMetadata).formularios_respondidos,
  ]));

  return {
    ...merged,
    formularios_respondidos: ids,
  };
}

export function mergeFormularioResponseMetadata(
  metadata: Record<string, unknown> | null | undefined,
  formularioId: string,
): CampesinoMetadataNormalized {
  const normalized = normalizeMetadata(metadata);
  const nextIds = Array.from(new Set([...normalized.formularios_respondidos, formularioId].filter(Boolean)));

  return {
    ...normalized,
    formularios_respondidos: nextIds,
  };
}

async function readCampesinoMetadataCache(): Promise<CampesinoMetadataCache> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.campesinoMetadata);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as CampesinoMetadataCache;
    }
  } catch {
    // Ignorar cache corrupto y volver a empezar.
  }

  return {};
}

async function writeCampesinoMetadataCache(cache: CampesinoMetadataCache): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.campesinoMetadata, JSON.stringify(cache));
}

async function persistFormularioResponseMetadata(campesinoId: string, formularioId: string): Promise<void> {
  if (!campesinoId || !formularioId) {
    return;
  }

  const cache = await readCampesinoMetadataCache();
  const currentMetadata = cache[campesinoId] as Record<string, unknown> | undefined;
  cache[campesinoId] = mergeFormularioResponseMetadata(currentMetadata, formularioId) as Record<string, unknown>;
  await writeCampesinoMetadataCache(cache);
}

function normalizeStructureValue(estructura: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!estructura || typeof estructura !== 'object' || Array.isArray(estructura)) {
    if (typeof estructura === 'string') {
      try {
        const parsed = JSON.parse(estructura) as unknown;
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : {};
      } catch {
        return {};
      }
    }

    return {};
  }

  return estructura as Record<string, unknown>;
}

export function getPreguntasFromStructure(estructura: Record<string, unknown> | null | undefined): FormQuestion[] {
  const normalized = normalizeStructureValue(estructura);
  const raw = normalized.preguntas;
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
      const rawUseAsFilter = item.use_as_filter ?? item.usar_como_filtro ?? item.useAsFilter ?? false;
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
        useAsFilter: Boolean(rawUseAsFilter),
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

export async function getCampesinoById(token: string, campesinoId: string): Promise<CampesinoRecord | null> {
  try {
    const all = await listCampesinos(token);
    const found = all.find((item) => item.id === campesinoId);
    if (!found) {
      return null;
    }

    const localCache = await readCampesinoMetadataCache();
    const mergedMetadata = mergeMetadataSources(found.metadata, localCache[campesinoId]);

    return {
      ...found,
      metadata: mergedMetadata,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && !error.response) {
      const cached = await getCachedCampesinoById(campesinoId);
      if (!cached) {
        return null;
      }

      const localCache = await readCampesinoMetadataCache();
      return {
        ...cached,
        metadata: mergeMetadataSources(cached.metadata, localCache[campesinoId]),
      };
    }
    throw error;
  }
}

export async function getFormularioById(token: string, formularioId: string): Promise<FormularioRecord | null> {
  const all = await getFormulariosActivos(token);
  return all.find((item) => item.id === formularioId) || null;
}

export async function getFormulariosActivos(token: string): Promise<FormularioRecord[]> {
  try {
    const all = await listFormularios(token);
    const active = all.filter((item) => item.activo);
    await AsyncStorage.setItem(STORAGE_KEYS.formulariosActivos, JSON.stringify(active));
    return active;
  } catch (error) {
    if (!(axios.isAxiosError(error) && !error.response)) {
      throw error;
    }

    const raw = await AsyncStorage.getItem(STORAGE_KEYS.formulariosActivos);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as FormularioRecord[]) : [];
    } catch {
      return [];
    }
  }
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
  campesinoId: string,
  formularioId: string,
  allActiveFormIds: string[],
  formularioTitulo: string,
): Promise<void> {
  await submitFormularioRespuesta(token, formularioId, payload);
  await persistFormularioResponseMetadata(campesinoId, formularioId);

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
  await persistFormularioResponseMetadata(item.campesinoId, item.formularioId);

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
  campesinoId: string,
  formularioId: string,
): Promise<Record<string, unknown> | null> {
  return getDraft(campesinoId, formularioId);
}

export async function saveDraftAnswers(
  campesinoId: string,
  formularioId: string,
  answers: Record<string, unknown>,
): Promise<void> {
  await saveDraft(campesinoId, formularioId, answers);
}

export async function clearDraftAnswers(campesinoId: string, formularioId: string): Promise<void> {
  await clearDraft(campesinoId, formularioId);
}

export async function getSubmissionHistoryByCampesino(
  campesinoId: string,
): Promise<SubmissionHistoryItem[]> {
  return getSubmissionHistoryByCampesinoDb(campesinoId);
}

export function parseFormStructure(estructura: Record<string, unknown> | null | undefined): FormStructure {
  const preguntas = getPreguntasFromStructure(estructura);
  return { preguntas };
}

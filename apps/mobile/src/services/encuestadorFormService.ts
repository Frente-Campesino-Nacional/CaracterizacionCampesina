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
  getAllSubmissionHistory as getAllSubmissionHistoryDb,
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
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return { formularios_respondidos: [] };
  }

  const raw = metadata.formularios_respondidos;
  const ids = Array.isArray(raw)
    ? raw
        .map((item) => String(item ?? '').trim())
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

export function mergeMetadataSources(
  baseMetadata: Record<string, unknown> | null | undefined,
  localMetadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const safeBase = baseMetadata && typeof baseMetadata === 'object' && !Array.isArray(baseMetadata) ? baseMetadata : {};
  const safeLocal = localMetadata && typeof localMetadata === 'object' && !Array.isArray(localMetadata) ? localMetadata : {};

  const merged = {
    ...safeBase,
    ...safeLocal,
  } as Record<string, unknown>;

  const ids = Array.from(new Set([
    ...normalizeMetadata(safeBase).formularios_respondidos,
    ...normalizeMetadata(safeLocal).formularios_respondidos,
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

export async function readCampesinoMetadataCache(): Promise<CampesinoMetadataCache> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.campesinoMetadata);
  const cleanMap: CampesinoMetadataCache = {};

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
          if (v && typeof v === 'object' && !Array.isArray(v)) {
            cleanMap[String(k)] = v as Record<string, unknown>;
          }
        }
      }
    } catch {
      // Ignorar cache corrupto
    }
  }

  try {
    const history = await getAllSubmissionHistoryDb();
    history.forEach((entry) => {
      if (entry && entry.campesinoId && entry.formularioId) {
        const cId = String(entry.campesinoId);
        const fId = String(entry.formularioId);
        cleanMap[cId] = mergeFormularioResponseMetadata(cleanMap[cId], fId) as Record<string, unknown>;
      }
    });
  } catch {
    // Ignorar si falla lectura de historial
  }

  try {
    const queue = await listQueuedSubmissions();
    queue.forEach((entry) => {
      if (entry && entry.campesinoId && entry.formularioId) {
        const cId = String(entry.campesinoId);
        const fId = String(entry.formularioId);
        cleanMap[cId] = mergeFormularioResponseMetadata(cleanMap[cId], fId) as Record<string, unknown>;
      }
    });
  } catch {
    // Ignorar si falla lectura de cola
  }

  return cleanMap;
}

async function writeCampesinoMetadataCache(cache: CampesinoMetadataCache): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.campesinoMetadata, JSON.stringify(cache));
}

export async function persistFormularioResponseMetadata(campesinoId: string, formularioId: string): Promise<void> {
  if (!campesinoId || !formularioId) {
    return;
  }

  const cache = await readCampesinoMetadataCache();
  const currentMetadata = cache[campesinoId] as Record<string, unknown> | undefined;
  cache[campesinoId] = mergeFormularioResponseMetadata(currentMetadata, formularioId) as Record<string, unknown>;
  await writeCampesinoMetadataCache(cache);
}

export async function submitAndMarkFormulario(
  token: string,
  payload: SubmitFormularioRespuestaPayload,
  campesinoId: string,
  formularioId: string,
  allActiveFormIds: string[],
  formularioTitulo: string,
): Promise<void> {
  await persistFormularioResponseMetadata(campesinoId, formularioId);
  await submitFormularioRespuesta(token, formularioId, payload);

  await addSubmissionHistory({
    campesinoId,
    formularioId,
    formularioTitulo,
    status: 'enviado',
    message: 'Formulario enviado al backend correctamente.',
  });
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
      const rawRequired = item.required ?? item.requerida ?? item.obligatoria ?? item.es_obligatoria ?? item.is_required ?? false;
      const rawUseAsFilter = item.use_as_filter ?? item.usar_como_filtro ?? item.useAsFilter ?? item.es_filtro ?? item.filtro ?? item.pregunta_filtro ?? false;
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
  if (!Array.isArray(questions)) return {};
  return questions.reduce<Record<string, unknown>>((acc, question) => {
    if (!question || !question.id) return acc;
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
  if (!Array.isArray(questions) || !answers || typeof answers !== 'object') return null;
  for (const question of questions) {
    if (!question || !question.required) {
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
    const safeAll = Array.isArray(all) ? all : [];
    const found = safeAll.find((item) => Boolean(item && item.id === campesinoId));
    if (!found) {
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

    const localCache = await readCampesinoMetadataCache();
    const mergedMetadata = mergeMetadataSources(found.metadata, localCache[campesinoId]);

    return {
      ...found,
      metadata: mergedMetadata,
    };
  } catch {
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
}

export async function getFormularioById(token: string, formularioId: string): Promise<FormularioRecord | null> {
  const all = await getFormulariosActivos(token);
  const safeAll = Array.isArray(all) ? all : [];
  return safeAll.find((item) => Boolean(item && item.id === formularioId)) || null;
}

export async function getFormulariosActivos(token: string): Promise<FormularioRecord[]> {
  try {
    const all = await listFormularios(token);
    const safeAll = Array.isArray(all) ? all : [];
    const active = safeAll.filter((item) => Boolean(item && item.activo));
    await AsyncStorage.setItem(STORAGE_KEYS.formulariosActivos, JSON.stringify(active));
    return active;
  } catch {
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
  const safeFormularios = Array.isArray(formulariosActivos) ? formulariosActivos : [];
  const normalizedMetadata = normalizeMetadata(metadata);
  const completedIds = new Set(
    normalizedMetadata.formularios_respondidos.map((id) => String(id).toLowerCase().trim()),
  );
  return safeFormularios.filter((item) => {
    if (!item || item.id == null) return false;
    const fId = String(item.id).toLowerCase().trim();
    return !completedIds.has(fId);
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
  return saveDraft(campesinoId, formularioId, {});
}

export function isRetryableSubmissionError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return !error.response || (error.response.status >= 500 && error.response.status <= 599);
  }
  return true;
}

export async function getSubmissionHistoryByCampesino(
  campesinoId: string,
): Promise<SubmissionHistoryItem[]> {
  return getSubmissionHistoryByCampesinoDb(campesinoId);
}

export async function getAllSubmissionHistory(): Promise<SubmissionHistoryItem[]> {
  return getAllSubmissionHistoryDb();
}

export function parseFormStructure(estructura: Record<string, unknown> | null | undefined): FormStructure {
  const preguntas = getPreguntasFromStructure(estructura);
  return { preguntas };
}

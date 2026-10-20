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
  FormQuestionType,
  FormStructure,
  QueuedFormularioSubmission,
  QuestionDependency,
  SubmissionHistoryItem,
  SubmitFormularioRespuestaPayload,
  CargaFamiliarItem,
  DEFAULT_CARGA_FAMILIAR_GRUPOS,
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

function extractRawQuestions(estructura: unknown): unknown[] {
  if (!estructura) return [];

  let current = estructura;
  if (typeof current === 'string') {
    try {
      current = JSON.parse(current);
    } catch {
      return [];
    }
  }

  // Handle double JSON-encoded strings
  if (typeof current === 'string') {
    try {
      current = JSON.parse(current);
    } catch {
      return [];
    }
  }

  if (Array.isArray(current)) {
    return current;
  }

  if (current && typeof current === 'object') {
    const obj = current as Record<string, unknown>;
    if (Array.isArray(obj.preguntas)) {
      return obj.preguntas;
    }
    if (Array.isArray(obj.fields)) {
      return obj.fields;
    }
    if (Array.isArray(obj.questions)) {
      return obj.questions;
    }
    if (Array.isArray(obj.secciones)) {
      const flattened: unknown[] = [];
      for (const sec of obj.secciones) {
        if (sec && typeof sec === 'object') {
          const secObj = sec as Record<string, unknown>;
          const qList = secObj.preguntas || secObj.fields || secObj.questions;
          if (Array.isArray(qList)) {
            flattened.push(...qList);
          }
        }
      }
      return flattened;
    }
    if (Array.isArray(obj.sections)) {
      const flattened: unknown[] = [];
      for (const sec of obj.sections) {
        if (sec && typeof sec === 'object') {
          const secObj = sec as Record<string, unknown>;
          const qList = secObj.fields || secObj.preguntas || secObj.questions;
          if (Array.isArray(qList)) {
            flattened.push(...qList);
          }
        }
      }
      return flattened;
    }
  }

  return [];
}

export function getPreguntasFromStructure(estructura: Record<string, unknown> | null | undefined): FormQuestion[] {
  const rawList = extractRawQuestions(estructura);
  if (!Array.isArray(rawList)) {
    return [];
  }

  return rawList
    .map((question, index) => {
      if (!question || typeof question !== 'object' || Array.isArray(question)) {
        return null;
      }

      const item = question as Record<string, unknown>;
      const rawId = item.id ?? item.key ?? item.name ?? `pregunta_${index + 1}`;
      const rawLabel = item.label ?? item.etiqueta ?? item.titulo ?? item.nombre ?? `Pregunta ${index + 1}`;
      const rawType = item.type ?? item.tipo ?? 'text';
      const rawRequired = item.required ?? item.requerida ?? item.obligatoria ?? item.es_obligatoria ?? item.is_required ?? false;
      const rawUseAsFilter = item.use_as_filter ?? item.usar_como_filtro ?? item.useAsFilter ?? item.es_filtro ?? item.filtro ?? item.pregunta_filtro ?? false;
      const rawSelectionMode = item.selectionMode ?? item.modoSeleccion ?? item.tipoSeleccion ?? item.multiple;

      const lowerType = String(rawType).toLowerCase().trim();
      let type: FormQuestionType = 'text';
      if (lowerType === 'number' || lowerType === 'numero' || lowerType === 'num' || lowerType === 'integer') {
        type = 'number';
      } else if (lowerType === 'date' || lowerType === 'fecha') {
        type = 'date';
      } else if (lowerType === 'boolean' || lowerType === 'booleano' || lowerType === 'si_no') {
        type = 'boolean';
      } else if (lowerType === 'select' || lowerType === 'seleccion' || lowerType === 'select_single' || lowerType === 'select_multiple') {
        type = 'select';
      } else if (lowerType === 'textarea' || lowerType === 'area_texto') {
        type = 'textarea';
      } else if (lowerType === 'rubros_agricolas' || lowerType === 'rubros' || lowerType === 'agricola' || lowerType === 'rubro') {
        type = 'rubros_agricolas';
      } else if (lowerType === 'produccion_animal' || lowerType === 'animal' || lowerType === 'pecuario' || lowerType === 'animales') {
        type = 'produccion_animal';
      } else if (lowerType === 'carga_familiar' || lowerType === 'familia' || lowerType === 'carga' || lowerType === 'demografia') {
        type = 'carga_familiar';
      } else {
        type = 'text';
      }

      const selectionMode = type === 'select'
        ? (lowerType === 'select_multiple' ? 'multiple' : normalizeSelectionMode(rawSelectionMode))
        : undefined;

      const options = parseQuestionOptions(item.options ?? item.opciones);

      const isBaseSurface = Boolean(
        item.is_base_surface ?? item.isBaseSurface ?? item.superficie_base ?? false,
      );

      let depends_on: QuestionDependency | undefined = undefined;
      const rawDep = item.depends_on ?? item.depende_de ?? item.dependsOn;
      if (rawDep && typeof rawDep === 'object' && !Array.isArray(rawDep)) {
        const depObj = rawDep as Record<string, unknown>;
        const qId = String(depObj.question_id ?? depObj.pregunta_id ?? '').trim();
        const val = String(depObj.value ?? depObj.valor ?? '').trim();
        if (qId) {
          depends_on = { question_id: qId, value: val };
        }
      }

      return {
        id: String(rawId),
        label: String(rawLabel),
        type,
        required: Boolean(rawRequired),
        useAsFilter: Boolean(rawUseAsFilter),
        placeholder: item.placeholder ? String(item.placeholder) : undefined,
        options,
        selectionMode,
        isBaseSurface,
        depends_on,
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

export function calcularTotalCargaFamiliar(items: unknown): {
  totalFemenino: number;
  totalMasculino: number;
  totalPersonas: number;
} {
  if (!Array.isArray(items)) {
    return { totalFemenino: 0, totalMasculino: 0, totalPersonas: 0 };
  }
  let totalFemenino = 0;
  let totalMasculino = 0;
  for (const item of items) {
    if (item && typeof item === 'object') {
      const f = Number((item as any).femenino);
      const m = Number((item as any).masculino);
      if (!isNaN(f) && f > 0) totalFemenino += f;
      if (!isNaN(m) && m > 0) totalMasculino += m;
    }
  }
  return {
    totalFemenino,
    totalMasculino,
    totalPersonas: totalFemenino + totalMasculino,
  };
}

export function calcularTotalM2Rubros(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  return value.reduce((sum, item) => {
    if (!item || typeof item !== 'object') return sum;
    const m2 = Number((item as any).superficie_m2 ?? (item as any).m2 ?? (item as any).superficie ?? 0);
    return sum + (Number.isFinite(m2) && m2 > 0 ? m2 : 0);
  }, 0);
}

export function calcularTotalM2Animales(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  return value.reduce((sum, item) => {
    if (!item || typeof item !== 'object') return sum;
    const m2 = Number((item as any).espacio_productivo_m2 ?? (item as any).espacio_m2 ?? (item as any).m2 ?? 0);
    return sum + (Number.isFinite(m2) && m2 > 0 ? m2 : 0);
  }, 0);
}

export function isQuestionVisible(
  question: FormQuestion,
  answers: Record<string, unknown>,
): boolean {
  if (!question.depends_on || !question.depends_on.question_id) {
    return true;
  }
  const parentValue = answers[question.depends_on.question_id];
  const expectedValue = String(question.depends_on.value ?? '').trim().toLowerCase();

  if (typeof parentValue === 'boolean') {
    if (parentValue === true && (expectedValue === 'si' || expectedValue === 'sí' || expectedValue === 'true')) {
      return true;
    }
    if (parentValue === false && (expectedValue === 'no' || expectedValue === 'false')) {
      return true;
    }
    return false;
  }

  const normalizedParent = String(parentValue ?? '').trim().toLowerCase();
  return normalizedParent === expectedValue;
}

export function buildDefaultAnswers(questions: FormQuestion[]): Record<string, unknown> {
  if (!Array.isArray(questions)) return {};
  return questions.reduce<Record<string, unknown>>((acc, question) => {
    if (!question || !question.id) return acc;
    if (question.type === 'carga_familiar') {
      acc[question.id] = DEFAULT_CARGA_FAMILIAR_GRUPOS.map((g: { grupo: string; label: string; rango_edad: string }) => ({
        grupo: g.grupo,
        label: g.label,
        rango_edad: g.rango_edad,
        femenino: 0,
        masculino: 0,
      }));
      return acc;
    }
    if (question.type === 'boolean') {
      acc[question.id] = false;
      return acc;
    }

    if (
      (question.type === 'select' && question.selectionMode === 'multiple') ||
      question.type === 'rubros_agricolas' ||
      question.type === 'produccion_animal'
    ) {
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

  // Encontrar la pregunta que actúa como superficie base del predio
  const baseSurfaceQuestion = questions.find(
    (q) => q.isBaseSurface || (q.type === 'number' && /superficie.*(predio|total)/i.test(q.label)),
  );
  const superficieBase = baseSurfaceQuestion ? Number(answers[baseSurfaceQuestion.id]) || 0 : 0;

  let totalRubrosM2 = 0;
  let totalAnimalesM2 = 0;

  for (const question of questions) {
    // Si la pregunta depende de otra y está oculta, no se valida
    if (!isQuestionVisible(question, answers)) {
      continue;
    }

    const value = answers[question.id];

    if (question.type === 'carga_familiar') {
      const { totalPersonas } = calcularTotalCargaFamiliar(value);
      if (question.required && totalPersonas === 0) {
        return `Debes registrar al menos una persona en la carga familiar para: ${question.label}`;
      }
      continue;
    }

    if (question.type === 'rubros_agricolas') {
      const rubrosM2 = calcularTotalM2Rubros(value);
      totalRubrosM2 += rubrosM2;
      if (question.required && (!Array.isArray(value) || value.length === 0)) {
        return `Debes seleccionar al menos un rubro en: ${question.label}`;
      }
      continue;
    }

    if (question.type === 'produccion_animal') {
      const animalM2 = calcularTotalM2Animales(value);
      totalAnimalesM2 += animalM2;
      if (question.required && (!Array.isArray(value) || value.length === 0)) {
        return `Debes registrar al menos una especie animal en: ${question.label}`;
      }
      continue;
    }

    if (!question.required) {
      continue;
    }

    if (question.type === 'boolean') {
      if (value !== true && value !== false) {
        return `Debes responder: ${question.label}`;
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

  // Validación cruzada de balance de superficie
  if (superficieBase > 0) {
    const totalOcupado = totalRubrosM2 + totalAnimalesM2;
    if (totalOcupado > superficieBase) {
      const excedente = totalOcupado - superficieBase;
      return `La superficie ocupada (${totalOcupado} m²) supera la superficie total del predio (${superficieBase} m²) por ${excedente} m². Por favor ajusta las cantidades.`;
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
    const all = await listFormularios(token, false);
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
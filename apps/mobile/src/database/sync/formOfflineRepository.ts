import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

type JsonObject = Record<string, unknown>;

export type QueueEntry = {
  id: string;
  campesinoId: number;
  formularioId: number;
  formularioTitulo: string;
  respuestas: JsonObject;
  allActiveFormIds: number[];
  encuestadorId?: number | undefined;
  capturedAtIso: string;
};

export type SubmissionHistoryEntry = {
  id: string;
  campesinoId: number;
  formularioId: number;
  formularioTitulo: string;
  status: 'enviado' | 'pendiente_offline' | 'sincronizado' | 'error';
  message: string;
  createdAt: number;
};

type WatermelonContext = {
  database: any;
  Q: any;
  draftsCollection: any;
  queueCollection: any;
  historyCollection: any;
};

let cachedContext: WatermelonContext | null | undefined;
let warnedFallback = false;

const STORAGE_KEYS = {
  drafts: 'offline-form-drafts-v1',
  queue: 'offline-form-queue-v1',
  history: 'offline-form-history-v1',
};

export async function getDraft(
  campesinoId: number,
  formularioId: number,
): Promise<JsonObject | null> {
  const watermelon = getWatermelonContext();
  if (!watermelon) {
    const drafts = await readDraftMap();
    const key = getDraftKey(campesinoId, formularioId);
    return drafts[key] || null;
  }

  const { draftsCollection, Q } = watermelon;
  const records = await draftsCollection
    .query(Q.where('campesino_id', campesinoId), Q.where('formulario_id', formularioId))
    .fetch();

  const first = records[0] as any;
  if (!first?._raw?.answers_json) {
    return null;
  }

  return parseJsonObject(first._raw.answers_json);
}

export async function saveDraft(
  campesinoId: number,
  formularioId: number,
  answers: JsonObject,
): Promise<void> {
  const watermelon = getWatermelonContext();
  if (!watermelon) {
    const drafts = await readDraftMap();
    drafts[getDraftKey(campesinoId, formularioId)] = answers;
    await AsyncStorage.setItem(STORAGE_KEYS.drafts, JSON.stringify(drafts));
    return;
  }

  const { database, draftsCollection, Q } = watermelon;
  const now = Date.now();
  const answersJson = JSON.stringify(answers);

  await database.write(async () => {
    const records = await draftsCollection
      .query(Q.where('campesino_id', campesinoId), Q.where('formulario_id', formularioId))
      .fetch();

    const first = records[0] as any;
    if (first) {
      await first.update((draft: any) => {
        draft._raw.answers_json = answersJson;
        draft._raw.updated_at = now;
      });
      return;
    }

    await draftsCollection.create((draft: any) => {
      draft._raw.campesino_id = campesinoId;
      draft._raw.formulario_id = formularioId;
      draft._raw.answers_json = answersJson;
      draft._raw.updated_at = now;
    });
  });
}

export async function clearDraft(campesinoId: number, formularioId: number): Promise<void> {
  const watermelon = getWatermelonContext();
  if (!watermelon) {
    const drafts = await readDraftMap();
    delete drafts[getDraftKey(campesinoId, formularioId)];
    await AsyncStorage.setItem(STORAGE_KEYS.drafts, JSON.stringify(drafts));
    return;
  }

  const { database, draftsCollection, Q } = watermelon;
  await database.write(async () => {
    const records = await draftsCollection
      .query(Q.where('campesino_id', campesinoId), Q.where('formulario_id', formularioId))
      .fetch();

    await Promise.all(records.map((item: any) => item.markAsDeleted()));
  });
}

export async function enqueueSubmission(input: {
  campesinoId: number;
  formularioId: number;
  formularioTitulo: string;
  respuestas: JsonObject;
  allActiveFormIds: number[];
  encuestadorId?: number | undefined;
  capturedAtIso: string;
}): Promise<void> {
  const watermelon = getWatermelonContext();
  if (!watermelon) {
    const queue = await readQueueMap();
    const id = createOfflineId('queue');
    queue[id] = {
      id,
      campesinoId: input.campesinoId,
      formularioId: input.formularioId,
      formularioTitulo: input.formularioTitulo,
      respuestas: input.respuestas,
      allActiveFormIds: input.allActiveFormIds,
      encuestadorId: input.encuestadorId,
      capturedAtIso: input.capturedAtIso,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.queue, JSON.stringify(queue));
    return;
  }

  const { database, queueCollection } = watermelon;
  await database.write(async () => {
    await queueCollection.create((record: any) => {
      record._raw.campesino_id = input.campesinoId;
      record._raw.formulario_id = input.formularioId;
      record._raw.formulario_titulo = input.formularioTitulo;
      record._raw.respuestas_json = JSON.stringify(input.respuestas);
      record._raw.all_active_form_ids_json = JSON.stringify(input.allActiveFormIds);
      record._raw.encuestador_id = input.encuestadorId ?? null;
      record._raw.captured_at_iso = input.capturedAtIso;
      record._raw.created_at = Date.now();
    });
  });
}

export async function listQueuedSubmissions(): Promise<QueueEntry[]> {
  const watermelon = getWatermelonContext();
  if (!watermelon) {
    const queue = await readQueueMap();
    return Object.values(queue).sort((a, b) => a.capturedAtIso.localeCompare(b.capturedAtIso));
  }

  const { queueCollection } = watermelon;
  const records = await queueCollection.query().fetch();
  return records.map((item: any) => ({
    id: String(item.id),
    campesinoId: Number(item._raw.campesino_id),
    formularioId: Number(item._raw.formulario_id),
    formularioTitulo: String(item._raw.formulario_titulo || 'Formulario'),
    respuestas: parseJsonObject(item._raw.respuestas_json),
    allActiveFormIds: parseNumberArray(item._raw.all_active_form_ids_json),
    encuestadorId: item._raw.encuestador_id != null ? Number(item._raw.encuestador_id) : undefined,
    capturedAtIso: String(item._raw.captured_at_iso),
  }));
}

export async function deleteQueuedSubmission(queueId: string): Promise<void> {
  const watermelon = getWatermelonContext();
  if (!watermelon) {
    const queue = await readQueueMap();
    delete queue[queueId];
    await AsyncStorage.setItem(STORAGE_KEYS.queue, JSON.stringify(queue));
    return;
  }

  const { database, queueCollection } = watermelon;
  await database.write(async () => {
    const record = await queueCollection.find(queueId);
    await (record as any).markAsDeleted();
  });
}

export async function addSubmissionHistory(input: {
  campesinoId: number;
  formularioId: number;
  formularioTitulo: string;
  status: SubmissionHistoryEntry['status'];
  message: string;
}): Promise<void> {
  const watermelon = getWatermelonContext();
  if (!watermelon) {
    const history = await readHistoryMap();
    const id = createOfflineId('history');
    history[id] = {
      id,
      campesinoId: input.campesinoId,
      formularioId: input.formularioId,
      formularioTitulo: input.formularioTitulo,
      status: input.status,
      message: input.message,
      createdAt: Date.now(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
    return;
  }

  const { database, historyCollection } = watermelon;
  await database.write(async () => {
    await historyCollection.create((record: any) => {
      record._raw.campesino_id = input.campesinoId;
      record._raw.formulario_id = input.formularioId;
      record._raw.formulario_titulo = input.formularioTitulo;
      record._raw.status = input.status;
      record._raw.message = input.message;
      record._raw.created_at = Date.now();
    });
  });
}

export async function getSubmissionHistoryByCampesino(
  campesinoId: number,
  limit = 20,
): Promise<SubmissionHistoryEntry[]> {
  const watermelon = getWatermelonContext();
  if (!watermelon) {
    const history = await readHistoryMap();
    return Object.values(history)
      .filter((item) => item.campesinoId === campesinoId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  const { historyCollection, Q } = watermelon;
  const records = await historyCollection
    .query(Q.where('campesino_id', campesinoId), Q.sortBy('created_at', Q.desc), Q.take(limit))
    .fetch();

  return records.map((item: any) => ({
    id: String(item.id),
    campesinoId: Number(item._raw.campesino_id),
    formularioId: Number(item._raw.formulario_id),
    formularioTitulo: String(item._raw.formulario_titulo || 'Formulario'),
    status: normalizeStatus(item._raw.status),
    message: String(item._raw.message || ''),
    createdAt: Number(item._raw.created_at || Date.now()),
  }));
}

function parseJsonObject(value: unknown): JsonObject {
  if (typeof value !== 'string') {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as JsonObject;
    }
    return {};
  } catch {
    return {};
  }
}

function parseNumberArray(value: unknown): number[] {
  if (typeof value !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0);
  } catch {
    return [];
  }
}

function normalizeStatus(status: unknown): SubmissionHistoryEntry['status'] {
  if (status === 'enviado' || status === 'pendiente_offline' || status === 'sincronizado' || status === 'error') {
    return status;
  }
  return 'error';
}

function getWatermelonContext(): WatermelonContext | null {
  if (cachedContext !== undefined) {
    return cachedContext;
  }

  // Expo Go does not include custom native modules like WatermelonDB.
  // Skip loading it entirely to avoid WMDatabaseBridge runtime diagnostics.
  if (Constants.appOwnership === 'expo') {
    cachedContext = null;
    if (!warnedFallback) {
      console.warn('[offlineRepository] Expo Go detectado, usando AsyncStorage en lugar de WatermelonDB.');
      warnedFallback = true;
    }
    return cachedContext;
  }

  try {
    const { Q } = require('@nozbe/watermelondb');
    const indexModule = require('../index') as { database?: any } | undefined;
    const database = indexModule?.database;

    if (!Q || !database || typeof database.get !== 'function' || typeof database.write !== 'function') {
      cachedContext = null;
      if (!warnedFallback) {
        console.warn('[offlineRepository] WatermelonDB no disponible, usando AsyncStorage.');
        warnedFallback = true;
      }
      return cachedContext;
    }

    cachedContext = {
      database,
      Q,
      draftsCollection: database.get('form_drafts'),
      queueCollection: database.get('form_submission_queue'),
      historyCollection: database.get('form_submission_history'),
    };
    return cachedContext;
  } catch (error) {
    cachedContext = null;
    if (!warnedFallback) {
      console.warn('[offlineRepository] WatermelonDB no disponible, usando AsyncStorage.');
      warnedFallback = true;
    }
    return cachedContext;
  }
}

function getDraftKey(campesinoId: number, formularioId: number): string {
  return `${campesinoId}:${formularioId}`;
}

function createOfflineId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readDraftMap(): Promise<Record<string, JsonObject>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.drafts);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, JsonObject>)
      : {};
  } catch {
    return {};
  }
}

async function readQueueMap(): Promise<Record<string, QueueEntry>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.queue);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, QueueEntry>)
      : {};
  } catch {
    return {};
  }
}

async function readHistoryMap(): Promise<Record<string, SubmissionHistoryEntry>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.history);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, SubmissionHistoryEntry>)
      : {};
  } catch {
    return {};
  }
}

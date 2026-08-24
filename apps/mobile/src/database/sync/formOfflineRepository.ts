import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

type JsonObject = Record<string, unknown>;

export type QueueEntry = {
  id: string;
  campesinoId: string;
  formularioId: string;
  formularioTitulo: string;
  respuestas: JsonObject;
  allActiveFormIds: string[];
  encuestadorId?: string | undefined;
  capturedAtIso: string;
};

export type SubmissionHistoryEntry = {
  id: string;
  campesinoId: string;
  formularioId: string;
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
  campesinoId: string,
  formularioId: string,
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
  campesinoId: string,
  formularioId: string,
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

export async function clearDraft(campesinoId: string, formularioId: string): Promise<void> {
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
  campesinoId: string;
  formularioId: string;
  formularioTitulo: string;
  respuestas: JsonObject;
  allActiveFormIds: string[];
  encuestadorId?: string | undefined;
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
    const queue = (await readQueueMap()) || {};
    return Object.values(queue)
      .filter((item): item is QueueEntry => Boolean(item && typeof item === 'object' && item.capturedAtIso))
      .map((item) => ({
        ...item,
        respuestas: parseJsonObject(item.respuestas),
      }))
      .sort((a, b) => (a.capturedAtIso || '').localeCompare(b.capturedAtIso || ''));
  }

  const { queueCollection } = watermelon;
  const records = await queueCollection.query().fetch();
  return records.map((item: any) => ({
    id: String(item.id),
    campesinoId: String(item._raw.campesino_id),
    formularioId: String(item._raw.formulario_id),
    formularioTitulo: String(item._raw.formulario_titulo || 'Formulario'),
    respuestas: parseJsonObject(item._raw.respuestas_json),
    allActiveFormIds: parseStringArray(item._raw.all_active_form_ids_json),
    encuestadorId: item._raw.encuestador_id != null ? String(item._raw.encuestador_id) : undefined,
    capturedAtIso: String(item._raw.captured_at_iso),
  }));
}

export async function deleteQueuedSubmission(queueId: string): Promise<void> {
  const watermelon = getWatermelonContext();
  if (!watermelon) {
    const queue = (await readQueueMap()) || {};
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

export async function reassignQueuedSubmissionsCampesinoId(
  previousCampesinoId: string,
  nextCampesinoId: string,
): Promise<void> {
  const pId = String(previousCampesinoId);
  const nId = String(nextCampesinoId);

  // 1. Reassign Queue
  const watermelon = getWatermelonContext();
  if (!watermelon) {
    const queue = (await readQueueMap()) || {};
    const updatedQueue: Record<string, QueueEntry> = {};

    for (const [id, entry] of Object.entries(queue)) {
      if (!entry) continue;
      updatedQueue[id] =
        String(entry.campesinoId) === pId
          ? { ...entry, campesinoId: nId }
          : entry;
    }

    await AsyncStorage.setItem(STORAGE_KEYS.queue, JSON.stringify(updatedQueue));
  } else {
    const { database, queueCollection, Q } = watermelon;
    await database.write(async () => {
      const records = await queueCollection
        .query(Q.where('campesino_id', pId))
        .fetch();

      await Promise.all(
        records.map((record: any) =>
          record.update((item: any) => {
            item._raw.campesino_id = nId;
          }),
        ),
      );
    });
  }

  // 2. Reassign Campesino Metadata Cache Key
  try {
    const rawMeta = await AsyncStorage.getItem('encuestador-campesino-metadata-cache-v1');
    if (rawMeta) {
      const meta = JSON.parse(rawMeta) as Record<string, unknown>;
      if (meta && meta[pId]) {
        meta[nId] = {
          ...((meta[nId] as Record<string, unknown>) || {}),
          ...((meta[pId] as Record<string, unknown>) || {}),
        };
        delete meta[pId];
        await AsyncStorage.setItem('encuestador-campesino-metadata-cache-v1', JSON.stringify(meta));
      }
    }
  } catch {
    // ignore
  }

  // 3. Reassign History
  try {
    const history = (await readHistoryMap()) || {};
    let changedHistory = false;
    for (const entry of Object.values(history)) {
      if (entry && String(entry.campesinoId) === pId) {
        entry.campesinoId = nId;
        changedHistory = true;
      }
    }
    if (changedHistory) {
      await AsyncStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
    }
  } catch {
    // ignore
  }

  // 4. Reassign Drafts
  try {
    const drafts = (await readDraftMap()) || {};
    const updatedDrafts: Record<string, JsonObject> = {};
    let changedDrafts = false;
    for (const [k, v] of Object.entries(drafts)) {
      if (k.startsWith(`${pId}:`)) {
        const rest = k.slice(pId.length);
        updatedDrafts[`${nId}${rest}`] = v;
        changedDrafts = true;
      } else {
        updatedDrafts[k] = v;
      }
    }
    if (changedDrafts) {
      await AsyncStorage.setItem(STORAGE_KEYS.drafts, JSON.stringify(updatedDrafts));
    }
  } catch {
    // ignore
  }
}

export async function addSubmissionHistory(input: {
  campesinoId: string;
  formularioId: string;
  formularioTitulo: string;
  status: SubmissionHistoryEntry['status'];
  message: string;
}): Promise<void> {
  const watermelon = getWatermelonContext();
  if (!watermelon) {
    const history = (await readHistoryMap()) || {};
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
  campesinoId: string,
  limit = 50,
): Promise<SubmissionHistoryEntry[]> {
  const targetId = String(campesinoId);
  const watermelon = getWatermelonContext();
  if (!watermelon) {
    const history = (await readHistoryMap()) || {};
    return Object.values(history)
      .filter((item): item is SubmissionHistoryEntry => Boolean(item && typeof item === 'object' && String(item.campesinoId) === targetId))
      .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
      .slice(0, limit);
  }

  try {
    const { historyCollection, Q } = watermelon;
    const records = await historyCollection
      .query(Q.where('campesino_id', targetId), Q.sortBy('created_at', Q.desc), Q.take(limit))
      .fetch();

    return records.map((item: any) => ({
      id: String(item.id),
      campesinoId: String(item._raw.campesino_id),
      formularioId: String(item._raw.formulario_id),
      formularioTitulo: String(item._raw.formulario_titulo || 'Formulario'),
      status: normalizeStatus(item._raw.status),
      message: String(item._raw.message || ''),
      createdAt: Number(item._raw.created_at || Date.now()),
    }));
  } catch {
    const history = (await readHistoryMap()) || {};
    return Object.values(history)
      .filter((item): item is SubmissionHistoryEntry => Boolean(item && typeof item === 'object' && String(item.campesinoId) === targetId))
      .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
      .slice(0, limit);
  }
}

export async function getAllSubmissionHistory(limit = 100): Promise<SubmissionHistoryEntry[]> {
  const watermelon = getWatermelonContext();
  if (!watermelon) {
    const history = (await readHistoryMap()) || {};
    return Object.values(history)
      .filter((item): item is SubmissionHistoryEntry => Boolean(item && typeof item === 'object'))
      .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
      .slice(0, limit);
  }

  try {
    const { historyCollection, Q } = watermelon;
    const records = await historyCollection
      .query(Q.sortBy('created_at', Q.desc), Q.take(limit))
      .fetch();

    return records.map((item: any) => ({
      id: String(item.id),
      campesinoId: String(item._raw.campesino_id),
      formularioId: String(item._raw.formulario_id),
      formularioTitulo: String(item._raw.formulario_titulo || 'Formulario'),
      status: normalizeStatus(item._raw.status),
      message: String(item._raw.message || ''),
      createdAt: Number(item._raw.created_at || Date.now()),
    }));
  } catch {
    const history = (await readHistoryMap()) || {};
    return Object.values(history)
      .filter((item): item is SubmissionHistoryEntry => Boolean(item && typeof item === 'object'))
      .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
      .slice(0, limit);
  }
}

function parseJsonObject(value: unknown): JsonObject {
  if (!value) {
    return {};
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as JsonObject;
  }
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

function parseStringArray(value: unknown): string[] {
  if (typeof value !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => String(item))
      .filter((item) => item.trim().length > 0);
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
  cachedContext = null;
  return null;
}

function getDraftKey(campesinoId: string, formularioId: string): string {
  return `${campesinoId}:${formularioId}`;
}

function createOfflineId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readDraftMap(): Promise<Record<string, JsonObject>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.drafts);
  if (!raw || raw === 'null' || raw === 'undefined') {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const result: Record<string, JsonObject> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          result[k] = v as JsonObject;
        }
      }
      return result;
    }
    return {};
  } catch {
    return {};
  }
}

async function readQueueMap(): Promise<Record<string, QueueEntry>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.queue);
  if (!raw || raw === 'null' || raw === 'undefined') {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const result: Record<string, QueueEntry> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          result[k] = v as QueueEntry;
        }
      }
      return result;
    }
    return {};
  } catch {
    return {};
  }
}

async function readHistoryMap(): Promise<Record<string, SubmissionHistoryEntry>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.history);
  if (!raw || raw === 'null' || raw === 'undefined') {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const result: Record<string, SubmissionHistoryEntry> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          result[k] = v as SubmissionHistoryEntry;
        }
      }
      return result;
    }
    return {};
  } catch {
    return {};
  }
}
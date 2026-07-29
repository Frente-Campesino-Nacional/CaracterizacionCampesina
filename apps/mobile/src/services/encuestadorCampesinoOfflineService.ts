import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {
  CampesinoPayload,
  CampesinoRecord,
  createCampesino,
  listCampesinos,
} from './adminService';
import { reassignQueuedSubmissionsCampesinoId } from '../database/sync/formOfflineRepository';

type QueuedCampesinoCreate = {
  queueId: string;
  tempId: string;
  payload: CampesinoPayload;
  createdAtIso: string;
};

const STORAGE_KEYS = {
  cache: 'encuestador-campesinos-cache-v1',
  queue: 'encuestador-campesinos-queue-v1',
};

function isRetryableNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  if (!error.response) {
    return true;
  }

  const status = error.response.status;
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function createOfflineId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toTempLocalId(): string {
  return createOfflineId('campesino-temp');
}

async function readCachedCampesinos(): Promise<CampesinoRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.cache);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as CampesinoRecord[];
  } catch {
    return [];
  }
}

async function writeCachedCampesinos(items: CampesinoRecord[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.cache, JSON.stringify(items));
}

async function readQueuedCreates(): Promise<QueuedCampesinoCreate[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.queue);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as QueuedCampesinoCreate[];
  } catch {
    return [];
  }
}

async function writeQueuedCreates(items: QueuedCampesinoCreate[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.queue, JSON.stringify(items));
}

function upsertById(items: CampesinoRecord[], record: CampesinoRecord): CampesinoRecord[] {
  const idx = items.findIndex((item) => item.id === record.id);
  if (idx === -1) {
    return [record, ...items];
  }
  const next = [...items];
  next[idx] = record;
  return next;
}

function buildLocalCampesinoRecord(payload: CampesinoPayload, tempId: string): CampesinoRecord {
  return {
    id: tempId,
    cedula: payload.cedula || `LOCAL-${tempId}`,
    nombre: payload.nombre,
    apellido: payload.apellido || null,
    telefono: payload.telefono || null,
    correo: payload.correo || null,
    fecha_nacimiento: payload.fecha_nacimiento || null,
    genero: payload.genero || null,
    estado: null,
    municipio: null,
    parroquia: null,
    direccion: payload.direccion || null,
    consejo_id: payload.consejo_id ?? null,
    creado_por: payload.creado_por ?? null,
    asignado_a: payload.asignado_a ?? null,
    tiene_pendientes: payload.tiene_pendientes ?? true,
    metadata: { offline_local: true },
    creado_en: payload.creado_en || new Date().toISOString(),
    actualizado_en: new Date().toISOString(),
  };
}

function filterForUser(items: CampesinoRecord[], userId: string): CampesinoRecord[] {
  return items.filter((item) => item.asignado_a === userId || item.creado_por === userId);
}

export async function loadCampesinosForEncuestador(token: string, userId: string): Promise<CampesinoRecord[]> {
  try {
    const all = await listCampesinos(token);
    const filtered = filterForUser(all, userId);
    await writeCachedCampesinos(filtered);
    return filtered;
  } catch (error) {
    if (!isRetryableNetworkError(error)) {
      throw error;
    }

    const cached = await readCachedCampesinos();
    return filterForUser(cached, userId);
  }
}

export async function getCachedCampesinoById(campesinoId: string): Promise<CampesinoRecord | null> {
  const cached = await readCachedCampesinos();
  return cached.find((item) => item.id === campesinoId) || null;
}

export async function createCampesinoWithOfflineFallback(
  token: string,
  payload: CampesinoPayload,
): Promise<{ record: CampesinoRecord; queuedOffline: boolean }> {
  try {
    const created = await createCampesino(token, payload);
    const cached = await readCachedCampesinos();
    await writeCachedCampesinos(upsertById(cached, created));
    return { record: created, queuedOffline: false };
  } catch (error) {
    if (!isRetryableNetworkError(error)) {
      throw error;
    }

    const tempId = toTempLocalId();
    const localRecord = buildLocalCampesinoRecord(payload, tempId);
    const queueItem: QueuedCampesinoCreate = {
      queueId: createOfflineId('campesino-create'),
      tempId,
      payload,
      createdAtIso: new Date().toISOString(),
    };

    const [cached, queued] = await Promise.all([readCachedCampesinos(), readQueuedCreates()]);
    await writeCachedCampesinos(upsertById(cached, localRecord));
    await writeQueuedCreates([...queued, queueItem]);
    return { record: localRecord, queuedOffline: true };
  }
}

export async function flushQueuedCampesinoCreates(token: string): Promise<number> {
  const queued = await readQueuedCreates();
  if (!queued.length) {
    return 0;
  }

  let synced = 0;
  let pending = [...queued];
  let cached = await readCachedCampesinos();

  for (const entry of queued) {
    try {
      const created = await createCampesino(token, entry.payload);
      cached = cached.filter((item) => item.id !== entry.tempId);
      cached = upsertById(cached, created);
      pending = pending.filter((item) => item.queueId !== entry.queueId);
      await reassignQueuedSubmissionsCampesinoId(entry.tempId, created.id);
      synced += 1;
    } catch (error) {
      if (isRetryableNetworkError(error)) {
        continue;
      }

      // If validation fails permanently, keep local data visible and remove from sync queue.
      pending = pending.filter((item) => item.queueId !== entry.queueId);
    }
  }

  await Promise.all([writeCachedCampesinos(cached), writeQueuedCreates(pending)]);
  return synced;
}
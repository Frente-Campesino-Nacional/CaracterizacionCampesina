import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {
  CampesinoPayload,
  CampesinoRecord,
  createCampesino,
  listCampesinos,
  saveCampesinoProfileImage,
} from './adminService';
import { reassignQueuedSubmissionsCampesinoId } from '../database/sync/formOfflineRepository';

export type PhotoOptions = {
  photoBase64?: string | undefined;
  photoMimeType?: string | undefined;
  photoFileName?: string | undefined;
  photoSource?: string | null | undefined;
};

type QueuedCampesinoCreate = {
  queueId: string;
  tempId: string;
  payload: CampesinoPayload;
  photoOptions?: PhotoOptions | undefined;
  createdAtIso: string;
};

const STORAGE_KEYS = {
  cache: 'encuestador-campesinos-cache-v1',
  queue: 'encuestador-campesinos-queue-v1',
};

function isRetryableNetworkError(error: unknown): boolean {
  if (!error) return true;

  if (!axios.isAxiosError(error)) {
    // Cualquier Error o mensaje de desconexion/red debe activar el guardado local offline
    return true;
  }

  if (!error.response) {
    return true;
  }

  const status = error.response.status;
  return status === 408 || status === 429 || status >= 500;
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
    return (parsed as CampesinoRecord[]).filter((item): item is CampesinoRecord => Boolean(item && item.id));
  } catch {
    return [];
  }
}

async function writeCachedCampesinos(items: CampesinoRecord[]): Promise<void> {
  const safeItems = (Array.isArray(items) ? items : []).filter((item): item is CampesinoRecord => Boolean(item && item.id));
  await AsyncStorage.setItem(STORAGE_KEYS.cache, JSON.stringify(safeItems));
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
    return (parsed as QueuedCampesinoCreate[]).filter((item): item is QueuedCampesinoCreate => Boolean(item && item.queueId));
  } catch {
    return [];
  }
}

async function writeQueuedCreates(items: QueuedCampesinoCreate[]): Promise<void> {
  const safeItems = (Array.isArray(items) ? items : []).filter((item): item is QueuedCampesinoCreate => Boolean(item && item.queueId));
  await AsyncStorage.setItem(STORAGE_KEYS.queue, JSON.stringify(safeItems));
}

function upsertById(items: CampesinoRecord[], record: CampesinoRecord): CampesinoRecord[] {
  const safeItems = (Array.isArray(items) ? items : []).filter((item): item is CampesinoRecord => Boolean(item && item.id));
  if (!record || !record.id) {
    return safeItems;
  }
  const idx = safeItems.findIndex((item) => item.id === record.id);
  if (idx === -1) {
    return [record, ...safeItems];
  }
  const next = [...safeItems];
  next[idx] = record;
  return next;
}

function buildLocalCampesinoRecord(payload: CampesinoPayload, tempId: string, photoOptions?: PhotoOptions): CampesinoRecord {
  const fotoUrl = photoOptions?.photoSource || (photoOptions?.photoBase64 ? `data:${photoOptions.photoMimeType || 'image/jpeg'};base64,${photoOptions.photoBase64}` : null);

  return {
    id: tempId,
    cedula: payload.cedula || 'Guardado localmente esperando sincronización',
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
    foto_url: fotoUrl,
    metadata: { offline_local: true },
    creado_en: payload.creado_en || new Date().toISOString(),
    actualizado_en: new Date().toISOString(),
  };
}

import { mergeMetadataSources, readCampesinoMetadataCache } from './encuestadorFormService';

function filterForUser(items: CampesinoRecord[], userId: string): CampesinoRecord[] {
  const safeItems = (Array.isArray(items) ? items : []).filter((item): item is CampesinoRecord => Boolean(item && item.id));
  return safeItems.filter((item) => item.asignado_a === userId || item.creado_por === userId);
}

export async function loadCampesinosForEncuestador(token: string, userId: string): Promise<CampesinoRecord[]> {
  const [localCache, queuedCreates] = await Promise.all([
    readCampesinoMetadataCache(),
    readQueuedCreates(),
  ]);

  try {
    const all = await listCampesinos(token);
    let filtered = filterForUser(all, userId);

    // Conservar campesinos creados offline que aun estan pendientes de sincronizacion
    for (const q of queuedCreates) {
      if (!filtered.some((c) => String(c.id) === String(q.tempId))) {
        filtered.unshift(buildLocalCampesinoRecord(q.payload, q.tempId, q.photoOptions));
      }
    }

    const withMergedMetadata = filtered.map((c) => ({
      ...c,
      metadata: mergeMetadataSources(c.metadata, localCache[String(c.id)]),
    }));
    await writeCachedCampesinos(withMergedMetadata);
    return withMergedMetadata;
  } catch (error) {
    if (!isRetryableNetworkError(error)) {
      throw error;
    }

    const cached = await readCachedCampesinos();
    let filtered = filterForUser(cached, userId);

    for (const q of queuedCreates) {
      if (!filtered.some((c) => String(c.id) === String(q.tempId))) {
        filtered.unshift(buildLocalCampesinoRecord(q.payload, q.tempId, q.photoOptions));
      }
    }

    return filtered.map((c) => ({
      ...c,
      metadata: mergeMetadataSources(c.metadata, localCache[String(c.id)]),
    }));
  }
}

export async function getCachedCampesinoById(campesinoId: string): Promise<CampesinoRecord | null> {
  const cached = await readCachedCampesinos();
  return cached.find((item) => Boolean(item && item.id === campesinoId)) || null;
}

export async function createCampesinoWithOfflineFallback(
  token: string,
  payload: CampesinoPayload,
  photoOptions?: PhotoOptions,
): Promise<{ record: CampesinoRecord; queuedOffline: boolean }> {
  try {
    const created = await createCampesino(token, payload);
    if (photoOptions?.photoBase64) {
      try {
        await saveCampesinoProfileImage(token, created.id, {
          content_type: photoOptions.photoMimeType || 'image/jpeg',
          file_name: photoOptions.photoFileName || 'foto-perfil.jpg',
          image_base64: photoOptions.photoBase64,
        });
        created.foto_url = photoOptions.photoSource || `data:${photoOptions.photoMimeType || 'image/jpeg'};base64,${photoOptions.photoBase64}`;
      } catch {
        // photo save non-fatal
      }
    }
    const cached = await readCachedCampesinos();
    await writeCachedCampesinos(upsertById(cached, created));
    return { record: created, queuedOffline: false };
  } catch (error) {
    if (!isRetryableNetworkError(error)) {
      throw error;
    }

    const tempId = toTempLocalId();
    const localRecord = buildLocalCampesinoRecord(payload, tempId, photoOptions);
    const queueItem: QueuedCampesinoCreate = {
      queueId: createOfflineId('campesino-create'),
      tempId,
      payload,
      photoOptions,
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
  let serverCampesinos: CampesinoRecord[] | null = null;

  for (const entry of queued) {
    try {
      const created = await createCampesino(token, entry.payload);
      if (entry.photoOptions?.photoBase64) {
        try {
          await saveCampesinoProfileImage(token, created.id, {
            content_type: entry.photoOptions.photoMimeType || 'image/jpeg',
            file_name: entry.photoOptions.photoFileName || 'foto-perfil.jpg',
            image_base64: entry.photoOptions.photoBase64,
          });
        } catch {
          // photo sync non-fatal
        }
      }
      cached = cached.filter((item) => item.id !== entry.tempId);
      cached = upsertById(cached, created);
      pending = pending.filter((item) => item.queueId !== entry.queueId);
      await reassignQueuedSubmissionsCampesinoId(entry.tempId, created.id);
      synced += 1;
    } catch (error) {
      if (isRetryableNetworkError(error)) {
        continue;
      }

      // Si es un conflicto 409/duplicado, buscar el campesino existente en el servidor y reasignar el ID para sincronizar sus formularios
      const isConflict =
        axios.isAxiosError(error) &&
        error.response &&
        (error.response.status === 409 ||
          error.response.status === 400 ||
          JSON.stringify(error.response.data || '').toLowerCase().includes('registrado') ||
          JSON.stringify(error.response.data || '').toLowerCase().includes('already exists'));

      if (isConflict) {
        try {
          if (!serverCampesinos) {
            serverCampesinos = await listCampesinos(token).catch(() => []);
          }
          const match = serverCampesinos.find(
            (c) =>
              (entry.payload.cedula && c.cedula && c.cedula.toLowerCase().trim() === entry.payload.cedula.toLowerCase().trim()) ||
              (entry.payload.correo && c.correo && c.correo.toLowerCase().trim() === entry.payload.correo.toLowerCase().trim()),
          );
          if (match) {
            cached = cached.filter((item) => item.id !== entry.tempId);
            cached = upsertById(cached, match);
            await reassignQueuedSubmissionsCampesinoId(entry.tempId, match.id);
            synced += 1;
          }
        } catch {
          // busqueda de coincidencia no fatal
        }
      }

      // Quitar de la cola de sincronizacion para evitar bucles repetidos de error
      pending = pending.filter((item) => item.queueId !== entry.queueId);
    }
  }

  await Promise.all([writeCachedCampesinos(cached), writeQueuedCreates(pending)]);
  return synced;
}
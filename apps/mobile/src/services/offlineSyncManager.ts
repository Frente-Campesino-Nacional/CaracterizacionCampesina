import { flushQueuedCampesinoCreates } from './encuestadorCampesinoOfflineService';
import { flushQueuedSubmissions } from './encuestadorFormService';

let syncInProgress = false;

export async function syncAllOfflineData(token: string): Promise<{ syncedCampesinos: number; syncedForms: number }> {
  if (!token || syncInProgress) {
    return { syncedCampesinos: 0, syncedForms: 0 };
  }

  syncInProgress = true;
  try {
    // 1. Sincronizar primero los campesinos creados offline para obtener sus IDs reales en la BD PostgreSQL
    const syncedCampesinos = await flushQueuedCampesinoCreates(token).catch(() => 0);

    // 2. Sincronizar despues las respuestas de formularios vinculadas (ya con los IDs reales reasignados)
    const syncedForms = await flushQueuedSubmissions(token).catch(() => 0);

    return { syncedCampesinos, syncedForms };
  } finally {
    syncInProgress = false;
  }
}

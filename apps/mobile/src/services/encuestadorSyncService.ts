import { Alert } from 'react-native';
import {
  flushQueuedCampesinoCreates,
  loadCampesinosForEncuestador,
} from './encuestadorCampesinoOfflineService';
import {
  flushQueuedSubmissions,
  getFormulariosActivos,
} from './encuestadorFormService';

export interface EncuestadorSyncResult {
  success: boolean;
  online: boolean;
  syncedCampesinos: number;
  syncedFormularios: number;
  totalCampesinos: number;
  totalFormularios: number;
  message: string;
}

/**
 * Ejecuta una sincronización completa de dos vías para el encuestador:
 * 1. Sube campesinos creados en modo offline al servidor.
 * 2. Sube respuestas de formularios acumuladas offline al servidor.
 * 3. Descarga y precarga la lista actualizada de campesinos asignados/creados.
 * 4. Descarga y precarga la estructura de formularios activos para uso sin conexión.
 */
export async function syncEncuestadorData(
  token: string,
  userId: string,
  showAlert: boolean = true,
): Promise<EncuestadorSyncResult> {
  if (!token || !userId) {
    const errorRes: EncuestadorSyncResult = {
      success: false,
      online: false,
      syncedCampesinos: 0,
      syncedFormularios: 0,
      totalCampesinos: 0,
      totalFormularios: 0,
      message: 'Sesión no válida para sincronizar.',
    };
    if (showAlert) {
      Alert.alert('Sincronización', errorRes.message);
    }
    return errorRes;
  }

  let syncedCampesinos = 0;
  let syncedFormularios = 0;
  let totalCampesinos = 0;
  let totalFormularios = 0;
  let isOnline = true;

  try {
    // Paso 1: Subir registros offline al servidor si hay conexión
    try {
      syncedCampesinos = await flushQueuedCampesinoCreates(token);
    } catch {
      // no fatal si falla parcialmente
    }

    try {
      syncedFormularios = await flushQueuedSubmissions(token);
    } catch {
      // no fatal si falla parcialmente
    }

    // Paso 2: Precargar / Cargar datos del servidor a almacenamiento local
    const campesinosList = await loadCampesinosForEncuestador(token, userId);
    totalCampesinos = Array.isArray(campesinosList) ? campesinosList.length : 0;

    const formulariosList = await getFormulariosActivos(token);
    totalFormularios = Array.isArray(formulariosList) ? formulariosList.length : 0;
  } catch (error: any) {
    isOnline = false;
    // Si la llamada red falla completamente, los metodos offline leen desde la cache local
    try {
      const cachedCampesinos = await loadCampesinosForEncuestador(token, userId);
      totalCampesinos = Array.isArray(cachedCampesinos) ? cachedCampesinos.length : 0;
      const cachedFormularios = await getFormulariosActivos(token);
      totalFormularios = Array.isArray(cachedFormularios) ? cachedFormularios.length : 0;
    } catch {
      // fallback silencioso
    }

    const offlineMsg =
      'Sin conexión con el servidor. Se mantendrá el trabajo con los datos guardados en caché local (Modo Offline).';
    if (showAlert) {
      Alert.alert('Modo Offline Activo', offlineMsg);
    }

    return {
      success: true,
      online: false,
      syncedCampesinos: 0,
      syncedFormularios: 0,
      totalCampesinos,
      totalFormularios,
      message: offlineMsg,
    };
  }

  // Generar mensaje detallado de éxito
  const parts: string[] = [];
  if (syncedCampesinos > 0) {
    parts.push(`${syncedCampesinos} campesino(s) subido(s)`);
  }
  if (syncedFormularios > 0) {
    parts.push(`${syncedFormularios} respuesta(s) subida(s)`);
  }

  const uploadDetail = parts.length ? `[${parts.join(', ')}] ` : '';
  const successMsg = `${uploadDetail}Sincronización exitosa. ${totalCampesinos} campesino(s) y ${totalFormularios} formulario(s) precargados para uso offline/online.`;

  if (showAlert) {
    Alert.alert('Sincronización Completada', successMsg);
  }

  return {
    success: true,
    online: isOnline,
    syncedCampesinos,
    syncedFormularios,
    totalCampesinos,
    totalFormularios,
    message: successMsg,
  };
}

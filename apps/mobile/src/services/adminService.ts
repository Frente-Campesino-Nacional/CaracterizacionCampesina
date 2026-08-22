import axios from 'axios';
import { getApiBaseUrl } from '../config/api';

import { useAuthStore } from '../store/authStore';

export const API_BASE_URL = getApiBaseUrl();

function createApiClient(token: string) {
  const instance = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 30000,
  });


  instance.interceptors.request.use((config) => {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        try {
          useAuthStore.getState().logout();
        } catch {
          // ignore
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
}


export type UserRole = string;

export interface UsuarioRecord {
  id: string;
  email: string;
  cedula?: string | null;
  nombre: string;
  apellido: string;
  rol: UserRole;
  numero_telefono?: string | null;
  fecha_nacimiento?: string | null;
  genero?: string | null;
  estado?: string | null;
  municipio?: string | null;
  parroquia?: string | null;
  direccion?: string | null;
  consejo_id?: string | null;
  activo: boolean;
  foto_url?: string | null;
  creado_en?: string | null;
  actualizado_en?: string | null;
}


export interface UsuarioProfileImageRecord {
  usuario_id: string;
  postgres_habilitado: boolean;
  imagen: {
    _id?: string;
    usuario_id: string;
    content_type: string;
    file_name?: string | null;
    size_bytes?: number | null;
    image_base64?: string | null;
    image_url?: string | null;
    metadata?: Record<string, unknown> | null;
    creado_en?: string | null;
    actualizado_en?: string | null;
  } | null;
}

export interface UsuarioPayload {
  email: string;
  password?: string | undefined;

  cedula?: string | undefined;
  nombre: string;
  apellido: string;
  rol?: UserRole | undefined;
  numero_telefono?: string | undefined;
  fecha_nacimiento?: string | undefined;
  estado_id?: number | undefined;
  genero?: string | undefined;
  municipio_id?: number | undefined;
  parroquia_id?: number | undefined;
  direccion?: string | undefined;
  consejo_id?: string | undefined;
  activo?: boolean | undefined;
  creado_en?: string | undefined;
  actualizado_en?: string | undefined;
}

export interface ConsejoRecord {
  id: string;
  nombre: string;
  descripcion?: string | null;
  estado: string;
  municipio: string;
  parroquia?: string | null;
  encargado_tipo: string;
  encargado_id: string;
  creado_en?: string | null;
  actualizado_en?: string | null;
}

export interface RoleRecord {
  id_rol: number;
  tipo_rol: string;
}

export interface GeneroRecord {
  id_gen: number;
  tipo_gen: string;
}

export interface UbicacionParroquiaRecord {
  id: number;
  nombre: string;
}

export interface UbicacionMunicipioRecord {
  id: number;
  nombre: string;
  parroquias: UbicacionParroquiaRecord[];
}

export interface UbicacionEstadoRecord {
  id: number;
  nombre: string;
  municipios: UbicacionMunicipioRecord[];
}

export interface ConsejoPayload {
  nombre: string;
  descripcion?: string | undefined;
  estado_id?: number | undefined;
  municipio_id?: number | undefined;
  parroquia_id?: number | undefined;
  encargado_tipo: string;
  encargado_id?: string | number | undefined;
  creado_en?: string | undefined;
  actualizado_en?: string | undefined;
}

export const listRoles = async (token: string): Promise<RoleRecord[]> => {
  const response = await createApiClient(token).get('/roles');
  return response.data;
};

export const listGeneros = async (token: string): Promise<GeneroRecord[]> => {
  const response = await createApiClient(token).get('/generos');
  return response.data;
};

export const getUbicacionCatalogos = async (): Promise<{ estados: UbicacionEstadoRecord[] }> => {
  const response = await axios.get(`${API_BASE_URL}/catalogos/ubicacion`, { timeout: 10000 });
  return response.data;
};

export interface CampesinoRecord {
  id: string;
  cedula: string;
  nombre: string;
  apellido?: string | null;
  telefono?: string | null;
  correo?: string | null;
  fecha_nacimiento?: string | null;
  genero?: string | null;
  estado?: string | null;
  municipio?: string | null;
  parroquia?: string | null;
  direccion?: string | null;
  consejo_id?: string | null;
  consejo_nombre?: string | null;
  creado_por?: string | null;
  asignado_a?: string | null;
  tiene_pendientes: boolean;
  metadata?: Record<string, unknown> | null;
  foto_url?: string | null;
  creado_en?: string | null;
  actualizado_en?: string | null;
}


export interface CampesinoProfileImageRecord {
  campesino_id: string;
  postgres_habilitado: boolean;
  imagen: {
    _id?: string;
    campesino_id: string;
    content_type: string;
    file_name?: string | null;
    size_bytes?: number | null;
    image_base64?: string | null;
    image_url?: string | null;
    metadata?: Record<string, unknown> | null;
    creado_en?: string | null;
    actualizado_en?: string | null;
  } | null;
}

export interface CampesinoPayload {
  cedula?: string;
  nombre: string;
  apellido?: string | undefined;
  telefono?: string | undefined;
  correo?: string | undefined;
  fecha_nacimiento?: string | undefined;
  estado_id?: number | undefined;
  genero?: string | undefined;
  municipio_id?: number | undefined;
  parroquia_id?: number | undefined;
  direccion?: string | undefined;
  consejo_id?: string | undefined;
  creado_por?: string | undefined;
  asignado_a?: string | undefined;
  tiene_pendientes?: boolean | undefined;
  metadata?: Record<string, unknown> | undefined;
  creado_en?: string | undefined;
  actualizado_en?: string | undefined;
}

export interface FormularioRecord {
  id: string;
  titulo: string;
  version: number;
  estructura: Record<string, unknown>;
  activo: boolean;
  creado_por: string | null;
  creado_en?: string | null;
  actualizado_en?: string | null;
}

export interface FormularioPayload {
  titulo: string;
  version?: number | undefined;
  estructura: Record<string, unknown>;
  activo?: boolean | undefined;
  creado_por: string;
  creado_en?: string | undefined;
  actualizado_en?: string | undefined;
}

export interface FormularioFilterQuestionRecord {
  formulario_id: string;
  formulario_titulo: string;
  pregunta_id: string;
  pregunta_label: string;
}

export interface CampesinoFiltroResultadoRecord {
  campesino_id: string;
  cedula: string;
  nombre: string;
  apellido?: string | null;
  telefono?: string | null;
  email?: string | null;
  consejo_nombre?: string | null;
  estado?: string | null;
  municipio?: string | null;
  parroquia?: string | null;
  formulario_titulo?: string | null;
  pregunta_id: string;
  pregunta_label: string;
  valor: string;
  capturado_en?: string | null;
}


export interface SubmitFormularioRespuestaPayload {
  campesino_id?: string | undefined;
  encuestador_id?: string | undefined;
  respuestas: Record<string, unknown>;
  metadata?: Record<string, unknown> | undefined;
  capturado_en?: string | undefined;
}

export interface SyncRecord {
  id: number;
  entidad: string;
  entidad_id: string;
  operacion: string;
  datos: Record<string, unknown>;
  estado: string;
  intentos: number;
  error?: string | null;
  creado_en: string;
  procesado_en?: string | null;
}

export const listUsuarios = async (token: string): Promise<UsuarioRecord[]> => {
  const response = await createApiClient(token).get('/usuarios');
  return response.data;
};

export const getUsuario = async (token: string, id: string): Promise<UsuarioRecord> => {
  const response = await createApiClient(token).get(`/usuarios/${id}`);
  return response.data;
};

export const createUsuario = async (token: string, payload: UsuarioPayload): Promise<UsuarioRecord> => {
  const response = await createApiClient(token).post('/usuarios', payload);
  return response.data;
};

export const updateUsuario = async (
  token: string,
  id: string,
  payload: Partial<UsuarioPayload>,
): Promise<UsuarioRecord> => {
  const response = await createApiClient(token).put(`/usuarios/${id}`, payload);
  return response.data;
};

export const deleteUsuario = async (token: string, id: string): Promise<void> => {
  await createApiClient(token).delete(`/usuarios/${id}`);
};

export const getUsuarioProfileImage = async (token: string, id: string): Promise<UsuarioProfileImageRecord> => {
  const response = await createApiClient(token).get(`/usuarios/${id}/foto-perfil`);
  return response.data;
};

export const saveUsuarioProfileImage = async (
  token: string,
  id: string,
  payload: {
    content_type: string;
    file_name?: string | undefined;
    size_bytes?: number | undefined;
    image_base64?: string | undefined;
    image_url?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
  },
): Promise<UsuarioProfileImageRecord> => {
  const response = await createApiClient(token).post(`/usuarios/${id}/foto-perfil`, payload);
  return response.data;
};

export const deleteUsuarioProfileImage = async (token: string, id: string): Promise<{ usuario_id: string; postgres_habilitado: boolean; eliminado: boolean }> => {
  const response = await createApiClient(token).delete(`/usuarios/${id}/foto-perfil`);
  return response.data;
};

export const listConsejos = async (token: string): Promise<ConsejoRecord[]> => {
  const response = await createApiClient(token).get('/consejos');
  return response.data;
};

export const createConsejo = async (token: string, payload: ConsejoPayload): Promise<ConsejoRecord> => {
  const response = await createApiClient(token).post('/consejos', payload);
  return response.data;
};

export const updateConsejo = async (
  token: string,
  id: string,
  payload: Partial<ConsejoPayload>,
): Promise<ConsejoRecord> => {
  const response = await createApiClient(token).put(`/consejos/${id}`, payload);
  return response.data;
};

export const deleteConsejo = async (token: string, id: string): Promise<void> => {
  await createApiClient(token).delete(`/consejos/${id}`);
};

export const listCampesinos = async (token: string): Promise<CampesinoRecord[]> => {
  const response = await createApiClient(token).get('/campesinos');
  return Array.isArray(response.data) ? response.data : [];
};

export const getCampesino = async (token: string, id: string): Promise<CampesinoRecord> => {
  const response = await createApiClient(token).get(`/campesinos/${id}`);
  return response.data;
};

export const getCampesinoProfileImage = async (
  token: string,
  id: string,
): Promise<CampesinoProfileImageRecord> => {
  const response = await createApiClient(token).get(`/campesinos/${id}/foto-perfil`);
  return response.data;
};

export const saveCampesinoProfileImage = async (
  token: string,
  id: string,
  payload: {
    content_type: string;
    file_name?: string | undefined;
    size_bytes?: number | undefined;
    image_base64?: string | undefined;
    image_url?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
  },
): Promise<CampesinoProfileImageRecord> => {
  const response = await createApiClient(token).post(`/campesinos/${id}/foto-perfil`, payload);
  return response.data;
};

export const deleteCampesinoProfileImage = async (
  token: string,
  id: string,
): Promise<{ campesino_id: string; postgres_habilitado: boolean; eliminado: boolean }> => {
  const response = await createApiClient(token).delete(`/campesinos/${id}/foto-perfil`);
  return response.data;
};

export const createCampesino = async (
  token: string,
  payload: CampesinoPayload,
): Promise<CampesinoRecord> => {
  const response = await createApiClient(token).post('/campesinos', payload);
  return response.data;
};

export const updateCampesino = async (
  token: string,
  id: string,
  payload: Partial<CampesinoPayload>,
): Promise<CampesinoRecord> => {
  const response = await createApiClient(token).put(`/campesinos/${id}`, payload);
  return response.data;
};

export const deleteCampesino = async (token: string, id: string): Promise<void> => {
  await createApiClient(token).delete(`/campesinos/${id}`);
};

export const listFormularios = async (token: string): Promise<FormularioRecord[]> => {
  const response = await createApiClient(token).get('/formularios');
  const rawItems = Array.isArray(response.data) ? response.data : [];
  return rawItems
    .map((item: any) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const id = item.id ?? item.id_formulario ?? item.id_formularios;
      if (!id) {
        return null;
      }

      let estructura = item.estructura;
      if (typeof estructura === 'string') {
        try {
          estructura = JSON.parse(estructura);
        } catch {
          estructura = {};
        }
      }

      return {
        ...item,
        id: String(id),
        activo: item.activo !== false && item.activo !== 0 && item.activo !== 'false' && item.activo !== '0',
        estructura: estructura && typeof estructura === 'object' && !Array.isArray(estructura)
          ? estructura
          : {},
      } as FormularioRecord;
    })
    .filter((item): item is FormularioRecord => Boolean(item));
};

export const createFormulario = async (
  token: string,
  payload: FormularioPayload,
): Promise<FormularioRecord> => {
  const response = await createApiClient(token).post('/formularios', payload);
  return response.data;
};

export const updateFormulario = async (
  token: string,
  id: string,
  payload: Partial<FormularioPayload>,
): Promise<FormularioRecord> => {
  const response = await createApiClient(token).put(`/formularios/${id}`, payload);
  return response.data;
};

export const deleteFormulario = async (token: string, id: string): Promise<void> => {
  await createApiClient(token).delete(`/formularios/${id}`);
};

export const listFormularioFilterQuestions = async (
  token: string,
): Promise<FormularioFilterQuestionRecord[]> => {
  const response = await createApiClient(token).get('/formularios/filtros/preguntas');
  return response.data;
};

export const listCampesinosByFormularioFilter = async (
  token: string,
  formularioId: string,
  preguntaId: string,
): Promise<CampesinoFiltroResultadoRecord[]> => {
  const response = await createApiClient(token).get('/formularios/filtros/resultados', {
    params: {
      formulario_id: formularioId,
      pregunta_id: preguntaId,
    },
  });
  return response.data;
};

export const submitFormularioRespuesta = async (
  token: string,
  formularioId: string,
  payload: SubmitFormularioRespuestaPayload,
): Promise<{ formulario_id: string; guardado_en_postgres: boolean; registro_id?: string }> => {
  const response = await createApiClient(token).post(`/formularios/${formularioId}/respuestas`, payload, {
    timeout: 2500,
  });
  return response.data;
};

export const listSyncRecords = async (token: string): Promise<SyncRecord[]> => {
  const response = await createApiClient(token).get('/sync');
  return response.data;
};
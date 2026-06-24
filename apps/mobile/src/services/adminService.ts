import axios from 'axios';
import { getApiBaseUrl } from '../config/api';

const API_BASE_URL = getApiBaseUrl();

function createApiClient(token: string) {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
  });

  instance.interceptors.request.use((config) => {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  return instance;
}

export type UserRole = string;

export interface UsuarioRecord {
  id: number;
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
  direccion?: string | null;
  consejo_id?: number | null;
  activo: boolean;
  creado_en?: string | null;
  actualizado_en?: string | null;
}

export interface UsuarioProfileImageRecord {
  usuario_id: number;
  mongo_habilitado: boolean;
  imagen: {
    _id?: string;
    usuario_id: number;
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
  genero?: string | undefined;
  estado?: string | undefined;
  municipio?: string | undefined;
  direccion?: string | undefined;
  consejo_id?: number | undefined;
  activo?: boolean | undefined;
  creado_en?: string | undefined;
  actualizado_en?: string | undefined;
}

export interface ConsejoRecord {
  id: number;
  nombre: string;
  descripcion?: string | null;
  estado: string;
  municipio: string;
  encargado_tipo: string;
  encargado_id: number;
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

export interface ConsejoPayload {
  nombre: string;
  descripcion?: string | undefined;
  estado: string;
  municipio: string;
  encargado_tipo: string;
  encargado_id: number;
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

export interface CampesinoRecord {
  id: number;
  cedula: string;
  nombre: string;
  apellido?: string | null;
  telefono?: string | null;
  correo?: string | null;
  fecha_nacimiento?: string | null;
  genero?: string | null;
  estado?: string | null;
  municipio?: string | null;
  direccion?: string | null;
  consejo_id?: number | null;
  consejo_nombre?: string | null;
  creado_por?: number | null;
  asignado_a?: number | null;
  tiene_pendientes: boolean;
  metadata?: Record<string, unknown> | null;
  creado_en?: string | null;
  actualizado_en?: string | null;
}

export interface CampesinoProfileImageRecord {
  campesino_id: number;
  mongo_habilitado: boolean;
  imagen: {
    _id?: string;
    campesino_id: number;
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
  genero?: string | undefined;
  estado?: string | undefined;
  municipio?: string | undefined;
  direccion?: string | undefined;
  consejo_id?: number | undefined;
  creado_por?: number | undefined;
  asignado_a?: number | undefined;
  tiene_pendientes?: boolean | undefined;
  metadata?: Record<string, unknown> | undefined;
  creado_en?: string | undefined;
  actualizado_en?: string | undefined;
}

export interface FormularioRecord {
  id: number;
  titulo: string;
  version: number;
  estructura: Record<string, unknown>;
  activo: boolean;
  creado_por: number;
  creado_en?: string | null;
  actualizado_en?: string | null;
}

export interface FormularioPayload {
  titulo: string;
  version?: number | undefined;
  estructura: Record<string, unknown>;
  activo?: boolean | undefined;
  creado_por: number;
  creado_en?: string | undefined;
  actualizado_en?: string | undefined;
}

export interface SubmitFormularioRespuestaPayload {
  campesino_id?: number | undefined;
  encuestador_id?: number | undefined;
  respuestas: Record<string, unknown>;
  metadata?: Record<string, unknown> | undefined;
  capturado_en?: string | undefined;
}

export interface SyncRecord {
  id: number;
  entidad: string;
  entidad_id: number;
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

export const getUsuario = async (token: string, id: number): Promise<UsuarioRecord> => {
  const response = await createApiClient(token).get(`/usuarios/${id}`);
  return response.data;
};

export const createUsuario = async (token: string, payload: UsuarioPayload): Promise<UsuarioRecord> => {
  const response = await createApiClient(token).post('/usuarios', payload);
  return response.data;
};

export const updateUsuario = async (
  token: string,
  id: number,
  payload: Partial<UsuarioPayload>,
): Promise<UsuarioRecord> => {
  const response = await createApiClient(token).put(`/usuarios/${id}`, payload);
  return response.data;
};

export const deleteUsuario = async (token: string, id: number): Promise<void> => {
  await createApiClient(token).delete(`/usuarios/${id}`);
};

export const getUsuarioProfileImage = async (token: string, id: number): Promise<UsuarioProfileImageRecord> => {
  const response = await createApiClient(token).get(`/usuarios/${id}/foto-perfil`);
  return response.data;
};

export const saveUsuarioProfileImage = async (
  token: string,
  id: number,
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

export const deleteUsuarioProfileImage = async (token: string, id: number): Promise<{ usuario_id: number; mongo_habilitado: boolean; eliminado: boolean }> => {
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
  id: number,
  payload: Partial<ConsejoPayload>,
): Promise<ConsejoRecord> => {
  const response = await createApiClient(token).put(`/consejos/${id}`, payload);
  return response.data;
};

export const deleteConsejo = async (token: string, id: number): Promise<void> => {
  await createApiClient(token).delete(`/consejos/${id}`);
};

export const listCampesinos = async (token: string): Promise<CampesinoRecord[]> => {
  const response = await createApiClient(token).get('/campesinos');
  return response.data;
};

export const getCampesino = async (token: string, id: number): Promise<CampesinoRecord> => {
  const response = await createApiClient(token).get(`/campesinos/${id}`);
  return response.data;
};

export const getCampesinoProfileImage = async (
  token: string,
  id: number,
): Promise<CampesinoProfileImageRecord> => {
  const response = await createApiClient(token).get(`/campesinos/${id}/foto-perfil`);
  return response.data;
};

export const saveCampesinoProfileImage = async (
  token: string,
  id: number,
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
  id: number,
): Promise<{ campesino_id: number; mongo_habilitado: boolean; eliminado: boolean }> => {
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
  id: number,
  payload: Partial<CampesinoPayload>,
): Promise<CampesinoRecord> => {
  const response = await createApiClient(token).put(`/campesinos/${id}`, payload);
  return response.data;
};

export const deleteCampesino = async (token: string, id: number): Promise<void> => {
  await createApiClient(token).delete(`/campesinos/${id}`);
};

export const listFormularios = async (token: string): Promise<FormularioRecord[]> => {
  const response = await createApiClient(token).get('/formularios');
  return response.data;
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
  id: number,
  payload: Partial<FormularioPayload>,
): Promise<FormularioRecord> => {
  const response = await createApiClient(token).put(`/formularios/${id}`, payload);
  return response.data;
};

export const deleteFormulario = async (token: string, id: number): Promise<void> => {
  await createApiClient(token).delete(`/formularios/${id}`);
};

export const submitFormularioRespuesta = async (
  token: string,
  formularioId: number,
  payload: SubmitFormularioRespuestaPayload,
): Promise<{ formulario_id: number; guardado_en_mongo: boolean; mongo_id?: string }> => {
  const response = await createApiClient(token).post(`/formularios/${formularioId}/respuestas`, payload);
  return response.data;
};

export const listSyncRecords = async (token: string): Promise<SyncRecord[]> => {
  const response = await createApiClient(token).get('/sync');
  return response.data;
};

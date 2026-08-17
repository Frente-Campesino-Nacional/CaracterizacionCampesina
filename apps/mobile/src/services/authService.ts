import axios from 'axios';
import { getApiBaseUrl } from '../config/api';

const api = axios.create({
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  return config;
});


export interface LoginResponse {
  user: {
    id: string;
    email: string;
    nombre: string;
    apellido?: string;
    rol: string;
    consejo_id?: string | null;
  };
  token: string;
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await api.post('/auth/login', {
      email,
      password,
    });

    const data = response.data;
    const token = data?.token || data?.access_token;

    if (!token) {
      throw new Error('Respuesta de autenticacion invalida: token no encontrado');
    }

    return {
      token,
      user: {
        ...data.user,
        id: data.user?.id,
        apellido: data.user?.apellido || '',
      },
    };
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Error en el servidor');
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Tiempo de espera agotado. Verifica la IP/puerto del backend.');
    } else if (error.request) {
      throw new Error(`No se pudo conectar al servidor (${getApiBaseUrl()})`);
    } else {
      throw new Error('Error desconocido');
    }
  }
};

export const getProfile = async (token: string) => {
  try {
    const response = await api.get('/auth/profile', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al obtener perfil');
  }
};
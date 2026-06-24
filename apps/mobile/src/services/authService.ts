import axios from 'axios';
import { getApiBaseUrl } from '../config/api';

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export interface LoginResponse {
  user: {
    id: number;
    email: string;
    nombre: string;
    apellido?: string;
    rol: string;
    consejo_id?: number;
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
        apellido: data.user?.apellido || '',
      },
    };
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Error en el servidor');
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Tiempo de espera agotado. Verifica la IP/puerto del backend.');
    } else if (error.request) {
      throw new Error(`No se pudo conectar al servidor (${API_BASE_URL})`);
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
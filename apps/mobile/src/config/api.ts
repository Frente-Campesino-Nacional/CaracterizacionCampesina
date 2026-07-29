import { Platform } from 'react-native';
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra || {}) as {
  apiBaseUrl?: string;
  apiPort?: number | string;
};

function normalizePort(value: unknown, fallback = 3008): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildFromExpoHostUri(port: number): string | undefined {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return undefined;

  const host = String(hostUri).split(':')[0];
  if (!host) return undefined;

  return `http://${host}:${port}/api`;
}

function getFallbackHost(port: number): string {
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${port}/api`;
  }

  if (Platform.OS === 'ios') {
    return `http://127.0.0.1:${port}/api`;
  }

  return `http://localhost:${port}/api`;
}

export function getApiBaseUrl(): string {
  const explicit = extra.apiBaseUrl;
  if (explicit && explicit.trim().length > 0) {
    return explicit.trim();
  }

  const port = normalizePort(extra.apiPort, 3008);
  const fromHostUri = buildFromExpoHostUri(port);
  if (fromHostUri) {
    return fromHostUri;
  }

  return getFallbackHost(port);
}

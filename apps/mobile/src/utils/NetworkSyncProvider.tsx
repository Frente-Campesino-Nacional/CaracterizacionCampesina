import React, { useEffect, useRef } from 'react';
// Dynamically require NetInfo to avoid build errors when native module is unavailable (Expo Go)
let NetInfo: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NetInfo = require('@react-native-community/netinfo');
} catch (e) {
  NetInfo = null;
}
import { flushQueuedSubmissions } from '../services/encuestadorFormService';
import { flushQueuedCampesinoCreates } from '../services/encuestadorCampesinoOfflineService';
import { useAuthStore } from '../store/authStore';

let flushing = false;

export default function NetworkSyncProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  const lastConnectedRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!NetInfo || typeof NetInfo.addEventListener !== 'function') {
      return () => undefined;
    }

    const unsubscribe = NetInfo.addEventListener((state: any) => {
      const isConnected = Boolean(state?.isConnected && state?.isInternetReachable);

      // avoid reacting to initial state if unknown
      if (lastConnectedRef.current === null) {
        lastConnectedRef.current = isConnected;
        return;
      }

      // only act when connection is regained
      if (!lastConnectedRef.current && isConnected) {
        // trigger flush once
        if (!flushing && token) {
          flushing = true;
          Promise.all([
            flushQueuedCampesinoCreates(token).catch(() => 0),
            flushQueuedSubmissions(token).catch(() => 0),
          ])
            .finally(() => {
              flushing = false;
            });
        }
      }

      lastConnectedRef.current = isConnected;
    });

    return () => unsubscribe();
  }, [token]);

  return <>{children}</>;
}

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import AppNavigator from './src/navigation/AppNavigator';
import NetworkSyncProvider from './src/utils/NetworkSyncProvider';
import { useAuthStore } from './src/store/authStore';
import { Theme } from './src/theme/colors';

enableScreens();

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      try {
        await useAuthStore.persist.rehydrate();
      } finally {
        if (active) {
          setReady(true);
        }
      }
    };

    hydrate();

    return () => {
      active = false;
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.colors.white }}>
        <ActivityIndicator size="large" color={Theme.colors.greenDark} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthBootstrap>
          <NetworkSyncProvider>
            <AppNavigator />
          </NetworkSyncProvider>
        </AuthBootstrap>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
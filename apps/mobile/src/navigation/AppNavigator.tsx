import React, { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../store/authStore';
import { CustomBottomTabNavigator } from '../components/CustomBottomTabNavigator';
import { adminTabsConfig, encuestadorTabsConfig } from './tabConfigs';
import { Theme } from '../theme/colors';
import { isAdminRole } from '../utils/roles';
import { syncAdminData, syncEncuestadorData } from '../services/encuestadorSyncService';

// Screens - Auth
import LoginScreen from '../screens/auth/LoginScreen';

// Screens - Admin
import AdminDashboard from '../screens/admin/AdminDashboard';
import AdminUsuariosScreen from '../screens/admin/AdminUsuariosScreen';
import AdminCampesinosScreen from '../screens/admin/AdminCampesinosScreen';
import AdminConsejosScreen from '../screens/admin/AdminConsejosScreen';
import AdminFormulariosScreen from '../screens/admin/AdminFormulariosScreen';
import AdminAuditoriaScreen from '../screens/admin/AdminAuditoriaScreen';

// Screens - Encuestador
import EncuestadorCampesinosScreen from '../screens/encuestador/EncuestadorCampesinosScreen';
import FormulariosPendientesScreen from '../screens/encuestador/FormulariosPendientesScreen';
import EncuestadorProfileScreen from '../screens/encuestador/EncuestadorProfileScreen';
import DynamicFormScreen from '../screens/encuestador/DynamicFormScreen';
import SubmissionResultScreen from '../screens/encuestador/SubmissionResultScreen';
import EncuestadorHistorialScreen from '../screens/encuestador/EncuestadorHistorialScreen';

import CampesinoDetailScreen from '../screens/shared/CampesinoDetailScreen';
import BasicRecordDetailScreen from '../screens/shared/BasicRecordDetailScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Admin Navigator con Bottom Tabs
 * 6 tabs principales: Dashboard, Usuarios, Campesinos, Consejos, Formularios, Auditoría
 */
function AdminNavigator({ logout }: { logout: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={({ navigation }) => ({
        headerShown: true,
        headerLeft: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => navigation.getParent()?.navigate('AdminPerfil' as never)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingLeft: Theme.spacing.md,
                paddingRight: Theme.spacing.xs,
                paddingVertical: Theme.spacing.sm,
                gap: 4,
              }}
            >
              <MaterialCommunityIcons
                name="account-circle-outline"
                size={26}
                color={Theme.colors.greenDark}
              />
              <Text
                style={{
                  color: Theme.colors.greenDark,
                  fontWeight: Theme.fontWeight.semibold,
                  fontSize: Theme.fontSize.sm,
                }}
              >
                Perfil
              </Text>
            </TouchableOpacity>
            <HeaderSyncButton />
          </View>
        ),
        headerRight: () => (
          <TouchableOpacity
            onPress={logout}
            style={{
              paddingHorizontal: Theme.spacing.md,
              paddingVertical: Theme.spacing.sm,
            }}
          >
            <Text
              style={{
                color: Theme.colors.error,
                fontWeight: Theme.fontWeight.semibold,
                fontSize: Theme.fontSize.base,
              }}
            >
              Cerrar sesión
            </Text>
          </TouchableOpacity>
        ),
      })}
      tabBar={(props) => (
        <CustomBottomTabNavigator {...props} tabsConfig={adminTabsConfig} />
      )}
    >
      <Tab.Screen
        name="AdminDashboard"
        component={AdminDashboard}
        options={{
          title: 'Dashboard',
          headerTitleAlign: 'center',
        }}
      />
      <Tab.Screen
        name="AdminUsers"
        component={AdminUsuariosScreen}
        options={{
          title: 'Usuarios',
          headerTitleAlign: 'center',
        }}
      />
      <Tab.Screen
        name="AdminCampesinos"
        component={AdminCampesinosScreen}
        options={{
          title: 'Campesinos',
          headerTitleAlign: 'center',
        }}
      />
      <Tab.Screen
        name="AdminConsejos"
        component={AdminConsejosScreen}
        options={{
          title: 'Consejos',
          headerTitleAlign: 'center',
        }}
      />
      <Tab.Screen
        name="AdminFormularios"
        component={AdminFormulariosScreen}
        options={{
          title: 'Formularios',
          headerTitleAlign: 'center',
        }}
      />
      <Tab.Screen
        name="AdminAuditoria"
        component={AdminAuditoriaScreen}
        options={{
          title: 'Auditoría',
          headerTitleAlign: 'center',
        }}
      />
    </Tab.Navigator>
  );
}

function HeaderSyncButton() {
  const { token, user } = useAuthStore();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (!token || !user?.id || syncing) return;
    setSyncing(true);
    try {
      if (isAdminRole(user.rol)) {
        await syncAdminData(token, user.id, true);
      } else {
        await syncEncuestadorData(token, user.id, true);
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleSync}
      disabled={syncing}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.sm,
        opacity: syncing ? 0.6 : 1,
      }}
    >
      {syncing ? (
        <ActivityIndicator size="small" color={Theme.colors.greenDark} />
      ) : (
        <MaterialCommunityIcons name="cloud-sync-outline" size={22} color={Theme.colors.greenDark} />
      )}
      <Text
        style={{
          color: Theme.colors.greenDark,
          fontWeight: Theme.fontWeight.semibold,
          fontSize: Theme.fontSize.sm,
        }}
      >
        {syncing ? 'Sincronizando...' : 'Sincronizar'}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Encuestador Navigator con Bottom Tabs
 * 3 tabs principales: Campesinos, Pendientes, Perfil
 */
function EncuestadorNavigator({ logout }: { logout: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerLeft: () => <HeaderSyncButton />,
        headerRight: () => (
          <TouchableOpacity
            onPress={logout}
            style={{
              paddingHorizontal: Theme.spacing.md,
              paddingVertical: Theme.spacing.sm,
            }}
          >
            <Text
              style={{
                color: Theme.colors.error,
                fontWeight: Theme.fontWeight.semibold,
                fontSize: Theme.fontSize.base,
              }}
            >
              Cerrar sesión
            </Text>
          </TouchableOpacity>
        ),
      }}
      tabBar={(props) => (
        <CustomBottomTabNavigator {...props} tabsConfig={encuestadorTabsConfig} />
      )}
    >
      <Tab.Screen
        name="EncuestadorDashboard"
        component={EncuestadorCampesinosScreen}
        options={{
          title: 'Campesinos',
          headerTitleAlign: 'center',
        }}
      />
      <Tab.Screen
        name="FormulariosPendientes"
        component={FormulariosPendientesScreen}
        options={{
          title: 'Pendientes',
          headerTitleAlign: 'center',
        }}
      />
      <Tab.Screen
        name="EncuestadorPerfil"
        component={EncuestadorProfileScreen}
        options={{
          title: 'Perfil',
          headerTitleAlign: 'center',
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, user, token, logout } = useAuthStore();
  const hasValidSession = isAuthenticated && Boolean(token);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!hasValidSession ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : isAdminRole(user?.rol) ? (
          <>
            <Stack.Screen name="AdminTabs">
              {() => <AdminNavigator logout={logout} />}
            </Stack.Screen>
            <Stack.Screen name="AdminPerfil">
              {() => <ProfileScreen title="Mi Perfil" />}
            </Stack.Screen>
            <Stack.Group screenOptions={{ presentation: 'modal' }}>
              <Stack.Screen name="DynamicForm" component={DynamicFormScreen} />
              <Stack.Screen name="BasicRecordDetail">
                {(props) => <BasicRecordDetailScreen {...(props as any)} />}
              </Stack.Screen>
            </Stack.Group>
          </>
        ) : (
          <>
            <Stack.Screen name="EncuestadorTabs">
              {() => <EncuestadorNavigator logout={logout} />}
            </Stack.Screen>
            <Stack.Group screenOptions={{ presentation: 'modal' }}>
              <Stack.Screen name="DynamicForm" component={DynamicFormScreen} />
              <Stack.Screen
                name="SubmissionResult"
                component={SubmissionResultScreen}
              />
              <Stack.Screen
                name="EncuestadorHistorial"
                component={EncuestadorHistorialScreen}
                options={{ headerShown: true, title: 'Historial de Cambios' }}
              />

              <Stack.Screen name="CampesinoDetail">
                {(props) => <CampesinoDetailScreen {...(props as any)} />}
              </Stack.Screen>
            </Stack.Group>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../store/authStore';
import { CustomBottomTabNavigator } from '../components/CustomBottomTabNavigator';
import { adminTabsConfig, encuestadorTabsConfig } from './tabConfigs';
import { Theme } from '../theme/colors';
import { isAdminRole } from '../utils/roles';

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
          <TouchableOpacity
            onPress={() => navigation.getParent()?.navigate('AdminPerfil' as never)}
            style={{
              paddingLeft: Theme.spacing.md,
              paddingRight: Theme.spacing.sm,
              paddingVertical: Theme.spacing.sm,
            }}
          >
            <MaterialCommunityIcons
              name="account-circle-outline"
              size={28}
              color={Theme.colors.greenDark}
            />
          </TouchableOpacity>
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

/**
 * Encuestador Navigator con Bottom Tabs
 * 3 tabs principales: Campesinos, Pendientes, Perfil
 */
function EncuestadorNavigator({ logout }: { logout: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
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
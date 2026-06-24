import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import EncuestadorCampesinosScreen from './EncuestadorCampesinosScreen';
import ProfileScreen from '../shared/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function EncuestadorDashboard() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen name="Campesinos" component={EncuestadorCampesinosScreen} />
      <Tab.Screen name="Perfil" options={{ title: 'Perfil' }}>
        {() => <ProfileScreen title="Perfil Encuestador" />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
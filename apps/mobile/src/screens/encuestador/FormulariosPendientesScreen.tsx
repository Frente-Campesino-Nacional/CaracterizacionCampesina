import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CampesinoRecord, FormularioRecord } from '../../services/adminService';
import { useAuthStore } from '../../store/authStore';
import { sharedScreenStyles } from '../../styles/sharedScreenStyles';
import {
  flushQueuedSubmissions,
  getCampesinoById,
  getFormulariosActivos,
  getPendingFormularios,
  normalizeMetadata,
} from '../../services/encuestadorFormService';
import { flushQueuedCampesinoCreates } from '../../services/encuestadorCampesinoOfflineService';

type RootStackParamList = {
  FormulariosPendientes: { campesinoId: string } | undefined;
  DynamicForm: {
    campesinoId: string;
    formularioId: string;
    allActiveFormIds: string[];
  };
};

type FormulariosPendientesRouteProp = RouteProp<RootStackParamList, 'FormulariosPendientes'>;

export default function FormulariosPendientesScreen() {
  const route = useRoute<FormulariosPendientesRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { token } = useAuthStore();
  const [campesino, setCampesino] = useState<CampesinoRecord | null>(null);
  const [formulariosActivos, setFormulariosActivos] = useState<FormularioRecord[]>([]);
  const [syncCount, setSyncCount] = useState(0);

  const campesinoId = route.params?.campesinoId;

  const load = useCallback(async () => {
    if (!token || campesinoId == null) {
      return;
    }

    await flushQueuedCampesinoCreates(token);
    const [campesinoData, formulariosData, flushed] = await Promise.all([
      getCampesinoById(token, campesinoId),
      getFormulariosActivos(token),
      flushQueuedSubmissions(token),
    ]);

    setCampesino(campesinoData);
    setFormulariosActivos(formulariosData);
    setSyncCount(flushed);
  }, [campesinoId, token]);

  useEffect(() => {
    load().catch((error: Error) => {
      Alert.alert('Error', error.message || 'No se pudieron cargar los formularios pendientes');
    });
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load]),
  );

  const pendingForms = useMemo(() => {
    return getPendingFormularios(formulariosActivos, campesino?.metadata ?? undefined);
  }, [campesino?.metadata, formulariosActivos]);

  const metadata = normalizeMetadata(campesino?.metadata ?? undefined);

  const openForm = (formularioId: string) => {
    if (campesinoId == null) {
      return;
    }

    navigation.navigate('DynamicForm', {
      campesinoId,
      formularioId,
      allActiveFormIds: formulariosActivos.map((item) => item.id),
    });
  };

  if (campesinoId == null) {
    return (
      <View style={sharedScreenStyles.centered}>
        <Text style={sharedScreenStyles.helperText}>Selecciona un campesino desde la pestaña Campesinos para ver sus formularios pendientes.</Text>
      </View>
    );
  }

  if (!campesino) {
    return (
      <View style={sharedScreenStyles.centered}>
        <Text style={sharedScreenStyles.helperText}>Cargando información del campesino...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={sharedScreenStyles.surfaceSoft} contentContainerStyle={sharedScreenStyles.contentMd}>
      <View style={sharedScreenStyles.card}>
        <Text style={sharedScreenStyles.cardTitleXl}>Formularios Pendientes</Text>
        <Text style={sharedScreenStyles.subtitleStrong}>Campesino: {campesino.nombre} {campesino.apellido || ''}</Text>
        <Text style={sharedScreenStyles.metaText}>Cédula: {campesino.cedula}</Text>
        <Text style={sharedScreenStyles.metaText}>Completados: {metadata.formularios_respondidos.length}</Text>
        <Text style={sharedScreenStyles.metaText}>Pendientes: {pendingForms.length}</Text>
        {syncCount > 0 ? <Text style={sharedScreenStyles.statusSuccess}>Se sincronizaron {syncCount} respuestas locales.</Text> : null}
      </View>

      {pendingForms.length ? (
        pendingForms.map((formulario) => (
          <View key={formulario.id} style={sharedScreenStyles.card}>
            <Text style={styles.formTitle}>{formulario.titulo}</Text>
            <Text style={styles.formDetail}>Versión: {formulario.version}</Text>
            <TouchableOpacity style={sharedScreenStyles.primaryButton} onPress={() => openForm(formulario.id)}>
              <Text style={sharedScreenStyles.primaryButtonText}>Llenar formulario</Text>
            </TouchableOpacity>
          </View>
        ))
      ) : (
        <View style={sharedScreenStyles.emptyCard}>
          <Text style={sharedScreenStyles.emptyTitle}>No hay formularios pendientes</Text>
          <Text style={sharedScreenStyles.emptySubtitle}>Este campesino ya completó todos los formularios activos.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  formTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  formDetail: { color: '#4b5563', marginBottom: 10 },
});

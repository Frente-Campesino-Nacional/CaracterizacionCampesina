import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CampesinoRecord, FormularioRecord } from '../../services/adminService';
import { useAuthStore } from '../../store/authStore';
import {
  flushQueuedSubmissions,
  getCampesinoById,
  getFormulariosActivos,
  getPendingFormularios,
  normalizeMetadata,
} from '../../services/encuestadorFormService';

type RootStackParamList = {
  FormulariosPendientes: { campesinoId: number } | undefined;
  DynamicForm: {
    campesinoId: number;
    formularioId: number;
    allActiveFormIds: number[];
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

  const openForm = (formularioId: number) => {
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
      <View style={styles.centered}>
        <Text style={styles.infoText}>Selecciona un campesino desde la pestaña Campesinos para ver sus formularios pendientes.</Text>
      </View>
    );
  }

  if (!campesino) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>Cargando información del campesino...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>Formularios Pendientes</Text>
        <Text style={styles.subtitle}>Campesino: {campesino.nombre} {campesino.apellido || ''}</Text>
        <Text style={styles.meta}>Cédula: {campesino.cedula}</Text>
        <Text style={styles.meta}>Completados: {metadata.formularios_respondidos.length}</Text>
        <Text style={styles.meta}>Pendientes: {pendingForms.length}</Text>
        {syncCount > 0 ? <Text style={styles.sync}>Se sincronizaron {syncCount} respuestas locales.</Text> : null}
      </View>

      {pendingForms.length ? (
        pendingForms.map((formulario) => (
          <View key={formulario.id} style={styles.formCard}>
            <Text style={styles.formTitle}>{formulario.titulo}</Text>
            <Text style={styles.formDetail}>Versión: {formulario.version}</Text>
            <TouchableOpacity style={styles.fillButton} onPress={() => openForm(formulario.id)}>
              <Text style={styles.fillButtonText}>Llenar formulario</Text>
            </TouchableOpacity>
          </View>
        ))
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No hay formularios pendientes</Text>
          <Text style={styles.emptySubtitle}>Este campesino ya completó todos los formularios activos.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  content: { padding: 12, gap: 10 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  infoText: { color: '#334155', fontWeight: '600' },
  headerCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  subtitle: { color: '#1f2937', fontWeight: '700', marginBottom: 4 },
  meta: { color: '#475569', marginBottom: 2 },
  sync: { color: '#047857', marginTop: 6, fontWeight: '700' },
  formCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  formTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  formDetail: { color: '#4b5563', marginBottom: 10 },
  fillButton: { backgroundColor: '#1d4ed8', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  fillButtonText: { color: '#fff', fontWeight: '700' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center' },
  emptyTitle: { fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  emptySubtitle: { color: '#64748b', textAlign: 'center' },
});

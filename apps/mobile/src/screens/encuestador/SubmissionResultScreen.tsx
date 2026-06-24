import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute, NavigatorScreenParams, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SubmissionHistoryItem } from '../../types/formularios';
import { getSubmissionHistoryByCampesino } from '../../services/encuestadorFormService';

type RouteParams = {
  campesinoId: number;
  formularioId: number;
  formularioTitulo: string;
  status: 'enviado' | 'pendiente_offline';
  message: string;
};

type EncuestadorTabParamList = {
  EncuestadorDashboard: undefined;
  FormulariosPendientes: { campesinoId: number };
  EncuestadorPerfil: undefined;
};

type RootStackParamList = {
  EncuestadorTabs: NavigatorScreenParams<EncuestadorTabParamList> | undefined;
  DynamicForm: undefined;
  SubmissionResult: undefined;
};

type SubmissionResultRouteProp = RouteProp<{ params: RouteParams }, 'params'>;

export default function SubmissionResultScreen() {
  const route = useRoute<SubmissionResultRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const params = route.params;
  const [history, setHistory] = useState<SubmissionHistoryItem[]>([]);

  useEffect(() => {
    getSubmissionHistoryByCampesino(params.campesinoId)
      .then((items) => setHistory(items))
      .catch(() => setHistory([]));
  }, [params.campesinoId]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.resultCard}>
        <Text style={styles.title}>Resultado del envío</Text>
        <Text style={styles.formTitle}>{params.formularioTitulo}</Text>
        <Text style={[styles.status, params.status === 'enviado' ? styles.sent : styles.queued]}>
          {params.status === 'enviado' ? 'Enviado al servidor' : 'Guardado offline'}
        </Text>
        <Text style={styles.message}>{params.message}</Text>
      </View>

      <View style={styles.historyCard}>
        <Text style={styles.historyTitle}>Historial de envíos</Text>
        {history.length ? (
          history.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <Text style={styles.itemTitle}>{item.formularioTitulo}</Text>
              <Text style={styles.itemStatus}>Estado: {item.status}</Text>
              <Text style={styles.itemMessage}>{item.message}</Text>
              <Text style={styles.itemDate}>{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Sin historial aún.</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() =>
          navigation.navigate('EncuestadorTabs', {
            screen: 'FormulariosPendientes',
            params: { campesinoId: params.campesinoId },
          })
        }
      >
        <Text style={styles.primaryButtonText}>Volver a pendientes</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() =>
          navigation.navigate('EncuestadorTabs', {
            screen: 'EncuestadorDashboard',
          })
        }
      >
        <Text style={styles.secondaryButtonText}>Ir al listado de campesinos</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  content: { padding: 12, gap: 10 },
  resultCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  formTitle: { color: '#1f2937', fontWeight: '700', marginBottom: 6 },
  status: { fontWeight: '800', marginBottom: 6 },
  sent: { color: '#047857' },
  queued: { color: '#b45309' },
  message: { color: '#475569' },
  historyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  historyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  historyItem: { borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 8, marginBottom: 8 },
  itemTitle: { fontWeight: '700', color: '#1f2937' },
  itemStatus: { color: '#334155' },
  itemMessage: { color: '#64748b' },
  itemDate: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  empty: { color: '#64748b' },
  primaryButton: { backgroundColor: '#1d4ed8', borderRadius: 10, alignItems: 'center', paddingVertical: 11 },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { backgroundColor: '#e2e8f0', borderRadius: 10, alignItems: 'center', paddingVertical: 11 },
  secondaryButtonText: { color: '#1f2937', fontWeight: '700' },
});

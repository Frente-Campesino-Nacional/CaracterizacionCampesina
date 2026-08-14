import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { getSubmissionHistoryByCampesino } from '../../services/encuestadorFormService';
import { listCampesinos } from '../../services/adminService';
import { sharedScreenStyles } from '../../styles/sharedScreenStyles';
import { Card, DateFilterDropdown, EntityFilterDropdown, ExportMenu } from '../../components';
import { DateFilterPeriod, filterItemsByDatePeriod } from '../../utils/dateFilterUtils';
import { EntityFilterOption, EntityFilterType, filterItemsByEntity } from '../../utils/entityFilterUtils';

const ENCUESTADOR_ENTITY_OPTIONS: EntityFilterOption[] = [
  { key: 'all', label: 'Todos los eventos de campesinos' },
  { key: 'campesino', label: 'Registros de Campesinos' },
  { key: 'formulario', label: 'Formularios Llenados' },
];

export default function EncuestadorHistorialScreen() {
  const { token, user } = useAuthStore();
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Date filter state (default 24h)
  const [datePeriod, setDatePeriod] = useState<DateFilterPeriod>('24h');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Entity filter state (default 'all')
  const [selectedEntity, setSelectedEntity] = useState<EntityFilterType>('all');

  useEffect(() => {
    if (!token || !user) return;
    setLoading(true);

    listCampesinos(token)
      .then(async (campesinos) => {
        // Strictly campesinos registered by this encuestador
        const myRegisteredCampesinos = campesinos.filter(
          (c) => c.creado_por === user.id
        );

        // Build log entries for Campesino Registration
        const registrationLogs = myRegisteredCampesinos.map((c) => ({
          id: `reg-${c.id}`,
          entidad: 'campesino',
          formularioTitulo: `Registro de Campesino`,
          campesinoNombre: `${c.nombre} ${c.apellido || ''}`.trim(),
          status: 'Procesado',
          message: `Campesino "${c.nombre} ${c.apellido || ''}" fue registrado`,
          line: `Campesino "${c.nombre} ${c.apellido || ''}" fue registrado por ${user.nombre || 'usted'}`,
          createdAt: c.creado_en || c.actualizado_en || new Date().toISOString(),
        }));

        // Build log entries for Forms filled out for my registered campesinos
        const historyPromises = myRegisteredCampesinos.map(async (c) => {
          try {
            const subs = await getSubmissionHistoryByCampesino(String(c.id));
            return subs.map((sub: any) => ({
              id: sub.id || Math.random(),
              entidad: 'formulario',
              formularioTitulo: sub.formularioTitulo || 'Formulario Censo',
              campesinoNombre: `${c.nombre} ${c.apellido || ''}`.trim(),
              status: sub.status || 'Enviado',
              message: `Formulario "${sub.formularioTitulo || 'Censo'}" completado para ${c.nombre} ${c.apellido || ''}`,
              line: `Formulario "${sub.formularioTitulo || 'Censo'}" llenado para campesino ${c.nombre} ${c.apellido || ''}`,
              createdAt: sub.createdAt || sub.creado_en || new Date().toISOString(),
            }));
          } catch {
            return [];
          }
        });

        const formLogsArray = await Promise.all(historyPromises);
        const allLogs = [...registrationLogs, ...formLogsArray.flat()].sort((a, b) => {
          const tA = new Date(a.createdAt || 0).getTime();
          const tB = new Date(b.createdAt || 0).getTime();
          return tB - tA;
        });

        setHistoryItems(allLogs);
      })
      .catch(() => setHistoryItems([]))
      .finally(() => setLoading(false));
  }, [token, user]);

  const filteredHistory = useMemo(() => {
    const byDate = filterItemsByDatePeriod(historyItems, datePeriod, customStart, customEnd);
    return filterItemsByEntity(byDate, selectedEntity);
  }, [historyItems, datePeriod, customStart, customEnd, selectedEntity]);

  const exportItems = useMemo(() => {
    return filteredHistory.map((item) => ({
      id: item.id || Math.random(),
      createdAt: item.createdAt,
      formularioTitulo: item.formularioTitulo || item.entidad,
      target_nombre: item.campesinoNombre || item.formularioTitulo,
      status: item.status || 'Procesado',
      message: item.message || item.line,
      line: item.line,
      entidad: item.entidad === 'campesino' ? 'Campesino' : 'Formulario',
      actor_nombre: user?.nombre || 'Encuestador',
      usuario_nombre: user?.nombre || 'Encuestador',
      actor_rol: 'Encuestador',
      tipo_usuario: 'Encuestador',
    }));
  }, [filteredHistory, user]);

  const formatLogDate = (value?: string) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView style={sharedScreenStyles.surfaceSoft} contentContainerStyle={sharedScreenStyles.contentMd}>
      <Text style={sharedScreenStyles.cardTitleXl}>Mi Historial de Cambios</Text>
      <Text style={styles.subtitle}>Campesinos registrados por usted y formularios completados.</Text>

      <Card variant="elevated" padding="md" style={sharedScreenStyles.card}>
        <Text style={sharedScreenStyles.cardTitleLg}>Filtros y Descargas</Text>

        <DateFilterDropdown
          selectedPeriod={datePeriod}
          onSelectPeriod={setDatePeriod}
          customStartDate={customStart}
          customEndDate={customEnd}
          onChangeCustomDates={(start, end) => {
            setCustomStart(start);
            setCustomEnd(end);
          }}
        />

        <EntityFilterDropdown
          selectedEntity={selectedEntity}
          onSelectEntity={setSelectedEntity}
          options={ENCUESTADOR_ENTITY_OPTIONS}
        />

        <ExportMenu items={exportItems} title="Historial Campesinos Encuestador" />
      </Card>

      <Card variant="elevated" padding="md" style={sharedScreenStyles.card}>
        <Text style={sharedScreenStyles.cardTitleLg}>Actividades Registradas</Text>

        {loading ? (
          <Text style={styles.empty}>Cargando historial de cambios...</Text>
        ) : filteredHistory.length ? (
          filteredHistory.map((item, index) => (
            <View key={item.id || index} style={styles.logItem}>
              <Text style={styles.logTitle}>{item.formularioTitulo || 'Actividad'}</Text>
              <Text style={styles.logText}>{item.message || item.line}</Text>
              <Text style={styles.logDate}>{formatLogDate(item.createdAt)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Sin actividades registradas para los filtros seleccionados.</Text>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  subtitle: { color: '#4b5563', marginBottom: 12 },
  logItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eef2f7' },
  logTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  logText: { color: '#334155', fontSize: 13, marginTop: 2 },
  logDate: { color: '#64748b', fontSize: 12, marginTop: 4 },
  empty: { color: '#64748b', textAlign: 'center', paddingVertical: 16 },
});


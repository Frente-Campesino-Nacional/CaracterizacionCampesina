import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View, FlatList } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import SearchBar from '../../components/SearchBar';
import { Card } from '../../components';
import { sharedScreenStyles } from '../../styles/sharedScreenStyles';
import { CampesinoRecord, SyncRecord, listCampesinos, listSyncRecords } from '../../services/adminService';
import { useAuthStore } from '../../store/authStore';

export default function AdminAuditoriaScreen() {
  const { token } = useAuthStore();
  const [syncItems, setSyncItems] = useState<SyncRecord[]>([]);
  const [campesinos, setCampesinos] = useState<CampesinoRecord[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!token) return;
    Promise.all([listSyncRecords(token), listCampesinos(token)])
      .then(([syncData, campesinosData]) => {
        setSyncItems(syncData);
        setCampesinos(campesinosData);
      })
      .catch(() => {
        setSyncItems([]);
        setCampesinos([]);
      });
  }, [token]);

  const logs = useMemo(() => {
    const text = search.toLowerCase();

    return syncItems
      .map((item) => {
        const line = String((item as any).mensaje || '').trim() || `${item.entidad || 'Registro'} fue ${item.operacion || 'actualizado'}`;
        return { id: item.id, line, creado_en: item.creado_en };
      })
      .filter((item) => item.line.toLowerCase().includes(text));
  }, [search, syncItems]);

  const genderCounts = useMemo(() => {
    const men = campesinos.filter((item) => (item.genero || '').toLowerCase().startsWith('m')).length;
    const women = campesinos.filter((item) => (item.genero || '').toLowerCase().startsWith('f')).length;
    const total = men + women;
    const menPct = total ? Number(((men * 100) / total).toFixed(1)) : 0;
    const womenPct = total ? Number(((women * 100) / total).toFixed(1)) : 0;
    return { men, women, menPct, womenPct };
  }, [campesinos]);

  const chartData = [
    { name: 'Hombres', population: genderCounts.men || 0, color: '#2563eb', legendFontColor: '#334155', legendFontSize: 12 },
    { name: 'Mujeres', population: genderCounts.women || 0, color: '#db2777', legendFontColor: '#334155', legendFontSize: 12 },
  ];

  const formatLogDate = (value: string) => {
    const date = new Date(value);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderLogItem = ({ item }: { item: { id: number; line: string; creado_en: string } }) => (
    <View style={styles.logItem}>
      <Text style={styles.logText}>{item.line}</Text>
      <Text style={styles.logDate}>{formatLogDate(item.creado_en)}</Text>
    </View>
  );

  return (
    <ScrollView style={sharedScreenStyles.surfaceSoft} contentContainerStyle={sharedScreenStyles.contentMd}>
      <Text style={sharedScreenStyles.cardTitleXl}>Auditoría</Text>
      <Text style={styles.subtitle}>Historial de movimientos y distribución por género.</Text>

      <Card variant="elevated" padding="md" style={sharedScreenStyles.card}>
        <Text style={sharedScreenStyles.cardTitleLg}>Porcentaje de hombres y mujeres</Text>
        <PieChart
          data={chartData}
          width={Dimensions.get('window').width - 40}
          height={180}
          chartConfig={{ color: () => '#111827' }}
          accessor="population"
          backgroundColor="transparent"
          hasLegend
          paddingLeft="8"
          absolute
        />
        <Text style={styles.percentLine}>Hombres: {genderCounts.menPct}% | Mujeres: {genderCounts.womenPct}%</Text>
      </Card>

      <Card variant="elevated" padding="md" style={sharedScreenStyles.card}>
        <Text style={sharedScreenStyles.cardTitleLg}>Movimientos recientes</Text>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar en historial" />
        {logs.length ? (
          <FlatList
            data={logs}
            renderItem={renderLogItem}
            keyExtractor={(item) => String(item.id)}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            scrollEnabled={false}
          />
        ) : (
          <Text style={styles.empty}>Sin registros de auditoría.</Text>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  subtitle: { color: '#4b5563' },
  percentLine: { color: '#334155', fontWeight: '700', marginTop: 6 },
  logItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eef2f7' },
  logText: { color: '#1f2937', fontSize: 13 },
  logDate: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  separator: { height: 8 },
  empty: { color: '#64748b', textAlign: 'center', paddingVertical: 12 },
});

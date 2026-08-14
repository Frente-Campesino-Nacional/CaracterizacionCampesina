import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Dimensions, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import SearchBar from '../../components/SearchBar';
import { Card, DateFilterDropdown, EntityFilterDropdown, ExportMenu, LookupSelectField } from '../../components';
import { sharedScreenStyles } from '../../styles/sharedScreenStyles';
import {
  CampesinoFiltroResultadoRecord,
  CampesinoRecord,
  FormularioFilterQuestionRecord,
  SyncRecord,
  listCampesinos,
  listCampesinosByFormularioFilter,
  listFormularioFilterQuestions,
  listSyncRecords,
} from '../../services/adminService';
import { useAuthStore } from '../../store/authStore';
import { DateFilterPeriod, filterItemsByDatePeriod } from '../../utils/dateFilterUtils';
import { EntityFilterType, filterItemsByEntity } from '../../utils/entityFilterUtils';
import { exportFormFilterToExcel, exportFormFilterToPDF } from '../../utils/formFilterExport';
import { Theme } from '../../theme/colors';

const PIE_COLORS = [
  '#2563eb', // Azul
  '#16a34a', // Verde
  '#ca8a04', // Amarillo/Dorado
  '#dc2626', // Rojo
  '#9333ea', // Púrpura
  '#0891b2', // Cian
  '#ea580c', // Naranja
  '#4f46e5', // Índigo
];

export default function AdminAuditoriaScreen() {
  const { token } = useAuthStore();
  const [syncItems, setSyncItems] = useState<SyncRecord[]>([]);
  const [campesinos, setCampesinos] = useState<CampesinoRecord[]>([]);
  const [search, setSearch] = useState('');
  
  // Date filter state (default 'today' desde 00:00 h)
  const [datePeriod, setDatePeriod] = useState<DateFilterPeriod>('today');

  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Entity filter state (default 'all')
  const [selectedEntity, setSelectedEntity] = useState<EntityFilterType>('all');

  // Form question filter state
  const [filterQuestions, setFilterQuestions] = useState<FormularioFilterQuestionRecord[]>([]);
  const [selectedFilterKey, setSelectedFilterKey] = useState<string>('');
  const [filterResults, setFilterResults] = useState<CampesinoFiltroResultadoRecord[]>([]);
  const [loadingFilterResults, setLoadingFilterResults] = useState(false);

  const buildFilterKey = (formularioId: string, preguntaId: string) => `${formularioId}::${preguntaId}`;

  useEffect(() => {
    if (!token) return;
    Promise.all([
      listSyncRecords(token),
      listCampesinos(token),
      listFormularioFilterQuestions(token),
    ])
      .then(([syncData, campesinosData, preguntasFiltro]) => {
        setSyncItems(syncData);
        setCampesinos(campesinosData);
        setFilterQuestions(preguntasFiltro);
      })
      .catch(() => {
        setSyncItems([]);
        setCampesinos([]);
        setFilterQuestions([]);
      });
  }, [token]);

  const rawLogs = useMemo(() => {
    const text = search.toLowerCase();

    return syncItems
      .map((item) => {
        const line = String((item as any).mensaje || '').trim() || `${item.entidad || 'Registro'} fue ${item.operacion || 'actualizado'}`;
        const target_nombre = (item as any).target_nombre || (item.datos as any)?.nombre || (item.datos as any)?.nombre_completo || 'N/A';
        const actor_nombre = (item as any).actor_nombre || (item.datos as any)?.usuario_nombre || 'Administrador';
        const actor_rol = (item as any).actor_rol || 'Administrador';

        return {
          id: item.id,
          line,
          creado_en: item.creado_en,
          entidad: item.entidad || 'Sistema',
          operacion: item.operacion,
          target_nombre,
          actor_nombre,
          actor_rol,
          tipo_usuario: actor_rol,
        };
      })
      .filter((item) => item.line.toLowerCase().includes(text));
  }, [search, syncItems]);

  const filteredLogs = useMemo(() => {
    const byDate = filterItemsByDatePeriod(rawLogs, datePeriod, customStart, customEnd);
    return filterItemsByEntity(byDate, selectedEntity);
  }, [rawLogs, datePeriod, customStart, customEnd, selectedEntity]);

  const filterQuestionOptions = useMemo(
    () => filterQuestions
      .map((item) => ({
        label: item.pregunta_label,
        value: buildFilterKey(item.formulario_id, item.pregunta_id),
        description: item.formulario_titulo,
      }))
      .sort((a, b) => {
        const byFormulario = (a.description || '').localeCompare(b.description || '', 'es', { sensitivity: 'base' });
        if (byFormulario !== 0) return byFormulario;
        return (a.label || '').localeCompare(b.label || '', 'es', { sensitivity: 'base' });
      }),
    [filterQuestions],
  );

  const selectedFilterQuestion = useMemo(
    () =>
      filterQuestions.find(
        (item) => buildFilterKey(item.formulario_id, item.pregunta_id) === selectedFilterKey,
      ) || null,
    [filterQuestions, selectedFilterKey],
  );

  const selectFilterQuestionByKey = async (key: string) => {
    if (!key || !token) {
      setSelectedFilterKey('');
      setFilterResults([]);
      return;
    }

    const selected = filterQuestions.find(
      (item) => buildFilterKey(item.formulario_id, item.pregunta_id) === key,
    );

    if (!selected) {
      setSelectedFilterKey('');
      setFilterResults([]);
      return;
    }

    setSelectedFilterKey(key);
    setLoadingFilterResults(true);

    try {
      const results = await listCampesinosByFormularioFilter(
        token,
        selected.formulario_id,
        selected.pregunta_id,
      );
      setFilterResults(results);
    } catch (error: any) {
      setFilterResults([]);
      Alert.alert('Error', error.message || 'No se pudieron cargar los resultados del filtro');
    } finally {
      setLoadingFilterResults(false);
    }
  };

  // Cálculo dinámico de gráfica de torta por opciones de respuesta
  const dynamicPieData = useMemo(() => {
    if (!selectedFilterQuestion || !filterResults.length) {
      return { chartData: [], summaryText: '' };
    }

    const countsMap = new Map<string, number>();
    filterResults.forEach((item) => {
      const val = (item.valor || 'Sin respuesta').trim();
      countsMap.set(val, (countsMap.get(val) || 0) + 1);
    });

    const total = filterResults.length;
    let colorIndex = 0;

    const chartData = Array.from(countsMap.entries()).map(([label, count]) => {
      const pct = Number(((count * 100) / total).toFixed(1));
      const color = PIE_COLORS[colorIndex % PIE_COLORS.length];
      colorIndex += 1;

      return {
        name: `${label} (${pct}%)`,
        population: count,
        color,
        legendFontColor: '#334155',
        legendFontSize: 11,
      };
    });

    const summaryParts = Array.from(countsMap.entries()).map(([label, count]) => {
      const pct = ((count * 100) / total).toFixed(1);
      return `${label}: ${pct}% (${count})`;
    });

    return {
      chartData,
      summaryText: summaryParts.join(' | '),
    };
  }, [selectedFilterQuestion, filterResults]);

  const handleExportFilterPDF = async () => {
    if (!selectedFilterQuestion || !filterResults.length) return;
    await exportFormFilterToPDF(
      filterResults,
      selectedFilterQuestion.formulario_titulo,
      selectedFilterQuestion.pregunta_label,
    );
  };

  const handleExportFilterExcel = async () => {
    if (!selectedFilterQuestion || !filterResults.length) return;
    await exportFormFilterToExcel(
      filterResults,
      selectedFilterQuestion.formulario_titulo,
      selectedFilterQuestion.pregunta_label,
    );
  };

  const formatLogDate = (value: string) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderLogItem = ({ item }: { item: { id: string | number; line: string; creado_en: string } }) => (
    <View style={styles.logItem}>
      <Text style={styles.logText}>{item.line}</Text>
      <Text style={styles.logDate}>{formatLogDate(item.creado_en)}</Text>
    </View>
  );

  return (
    <ScrollView style={sharedScreenStyles.surfaceSoft} contentContainerStyle={sharedScreenStyles.contentMd}>
      <Text style={sharedScreenStyles.cardTitleXl}>Auditoría y Análisis de Respuestas</Text>
      <Text style={styles.subtitle}>Análisis porcentual por formulario y registro de auditoría.</Text>

      {/* Tarjeta de Gráfica Dinámica de Preguntas de Formulario */}
      <Card variant="elevated" padding="md" style={sharedScreenStyles.card}>
        <Text style={sharedScreenStyles.cardTitleLg}>Análisis Porcentual de Respuestas</Text>

        {/* Seleccionar Pregunta de Filtro */}
        {filterQuestions.length ? (
          <LookupSelectField
            label="Formulario y Pregunta de Filtro"
            value={selectedFilterKey}
            options={filterQuestionOptions}
            onChange={selectFilterQuestionByKey}
            placeholder="Seleccione un formulario y pregunta..."
            searchPlaceholder="Buscar formulario o pregunta..."
            allowClear
            clearLabel="Quitar filtro"
          />
        ) : (
          <Text style={styles.emptyPrompt}>No hay preguntas de formularios configuradas como filtro.</Text>
        )}

        {/* Gráfica de Torta o Mensaje de Invitación */}
        {selectedFilterQuestion ? (
          loadingFilterResults ? (
            <Text style={styles.emptyPrompt}>Cargando respuestas...</Text>
          ) : filterResults.length && dynamicPieData.chartData.length ? (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>
                {selectedFilterQuestion.formulario_titulo} - "{selectedFilterQuestion.pregunta_label}"
              </Text>

              <PieChart
                data={dynamicPieData.chartData}
                width={Dimensions.get('window').width - 40}
                height={190}
                chartConfig={{ color: () => '#111827' }}
                accessor="population"
                backgroundColor="transparent"
                hasLegend
                paddingLeft="8"
                absolute
              />

              <Text style={styles.percentLine}>{dynamicPieData.summaryText}</Text>

              {/* Botones de Descarga PDF / Excel del Filtro de Formularios (10 campos) */}
              <View style={styles.exportFilterButtonsRow}>
                <TouchableOpacity
                  style={[styles.filterExportBtn, styles.pdfBtn]}
                  onPress={handleExportFilterPDF}
                >
                  <MaterialCommunityIcons name="file-pdf-box" size={18} color="#ffffff" style={{ marginRight: 4 }} />
                  <Text style={styles.filterExportBtnText}>Descargar PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterExportBtn, styles.excelBtn]}
                  onPress={handleExportFilterExcel}
                >
                  <MaterialCommunityIcons name="file-excel-box" size={18} color="#ffffff" style={{ marginRight: 4 }} />
                  <Text style={styles.filterExportBtnText}>Descargar Excel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyPrompt}>Sin respuestas registradas para la pregunta seleccionada.</Text>
          )
        ) : (
          <View style={styles.promptBox}>
            <MaterialCommunityIcons name="chart-pie" size={40} color={Theme.colors.greenDark} style={{ marginBottom: 8 }} />
            <Text style={styles.promptText}>
              Seleccione un formulario y una pregunta de filtro para visualizar la distribución de respuestas en la gráfica de torta.
            </Text>
          </View>
        )}
      </Card>

      {/* Tarjeta de Movimientos e Historial de Auditoría */}
      <Card variant="elevated" padding="md" style={sharedScreenStyles.card}>
        <Text style={sharedScreenStyles.cardTitleLg}>Movimientos e Historial de Cambios</Text>
        
        {/* Dropdown de Filtro por Fecha */}
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

        {/* Dropdown de Filtro por Tipo de Entidad */}
        <EntityFilterDropdown
          selectedEntity={selectedEntity}
          onSelectEntity={setSelectedEntity}
        />

        {/* Menú de Exportación PDF / Excel de Historial */}
        <ExportMenu items={filteredLogs} title="Reporte Auditoria Administrador" />

        <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar en historial" />
        
        {filteredLogs.length ? (
          <FlatList
            data={filteredLogs}
            renderItem={renderLogItem}
            keyExtractor={(item) => String(item.id)}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            scrollEnabled={false}
          />
        ) : (
          <Text style={styles.emptyPrompt}>Sin registros de auditoría para los filtros seleccionados.</Text>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  subtitle: { color: '#4b5563', marginBottom: 12 },
  chartContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  percentLine: {
    color: '#334155',
    fontWeight: '700',
    marginTop: 6,
    fontSize: 12,
    textAlign: 'center',
  },
  promptBox: {
    padding: 20,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  promptText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyPrompt: {
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 16,
    fontSize: 13,
  },
  exportFilterButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    width: '100%',
  },
  filterExportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
  },
  pdfBtn: {
    backgroundColor: '#dc2626',
  },
  excelBtn: {
    backgroundColor: '#15803d',
  },
  filterExportBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  logItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eef2f7' },
  logText: { color: '#1f2937', fontSize: 13 },
  logDate: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  separator: { height: 8 },
});

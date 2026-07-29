import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import axios from 'axios';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DatePickerField from '../../components/DatePickerField';
import PendingDot from '../../components/PendingDot';
import SearchBar from '../../components/SearchBar';
import { Card, OptionSelector, GENDER_OPTIONS, LookupSelectField, RoleSectionHeader, FormModalSheet, StatusPill } from '../../components';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import StateMunicipioPicker from '../../components/StateMunicipioPicker';
import { Theme } from '../../theme/colors';
import { CampesinoPayload, CampesinoRecord, ConsejoRecord, GeneroRecord, createCampesino, listCampesinos, listConsejos, listGeneros } from '../../services/adminService';
import { flushQueuedSubmissions } from '../../services/encuestadorFormService';
import {
  createCampesinoWithOfflineFallback,
  flushQueuedCampesinoCreates,
  loadCampesinosForEncuestador,
} from '../../services/encuestadorCampesinoOfflineService';
import { useAuthStore } from '../../store/authStore';
import { FlatList } from 'react-native';

type RootStackParamList = {
  CampesinoDetail: { campesinoId: string };
  FormulariosPendientes: { campesinoId: string };
};

type CampesinoFormState = {
  cedulaMode: 'manual' | 'foreign' | 'venezolano' | 'none';
  cedula: string;
  nombre: string;
  apellido: string;
  telefono: string;
  correo: string;
  fecha_nacimiento: string;
  genero: string;
  estado_id: string;
  estado_nombre: string;
  municipio_id: string;
  municipio_nombre: string;
  parroquia_id: string;
  parroquia_nombre: string;
  direccion: string;
  consejo_id: string;
  tiene_pendientes: boolean;
};

function defaultForm(consejoId?: string | null): CampesinoFormState {
  return {
    cedulaMode: 'none',
    cedula: '',
    nombre: '',
    apellido: '',
    telefono: '',
    correo: '',
    fecha_nacimiento: '',
    genero: '',
    estado_id: '',
    estado_nombre: '',
    municipio_id: '',
    municipio_nombre: '',
    parroquia_id: '',
    parroquia_nombre: '',
    direccion: '',
    consejo_id: consejoId != null ? String(consejoId) : '',
    tiene_pendientes: true,
  };
}

function buildCedulaValue(mode: CampesinoFormState['cedulaMode'], value: string): string | undefined {
  const trimmed = value.trim().replace(/\s+/g, '').toUpperCase();
  if (mode === 'none') return undefined;
  if (mode === 'venezolano') return trimmed ? `V-${trimmed.replace(/^V-/, '')}` : undefined;
  if (mode === 'foreign') return trimmed ? `E-${trimmed.replace(/^E-/, '')}` : undefined;
  return trimmed || undefined;
}

function toOptionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function toOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toOptionalIsoDate(value: string): string | undefined {
  const parsed = toOptionalString(value);
  if (!parsed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
    return `${parsed}T00:00:00.000Z`;
  }
  return parsed;
}

function getRequestErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;
    if (typeof responseData === 'string' && responseData.trim()) {
      return responseData;
    }

    if (responseData && typeof responseData === 'object') {
      const record = responseData as Record<string, unknown>;
      const message = record.message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }

      if (Array.isArray(message) && message.length) {
        return message.map((item) => String(item)).join('\n');
      }

      const errors = record.errors;
      if (Array.isArray(errors) && errors.length) {
        return errors.map((item) => String(item)).join('\n');
      }
    }

    return error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export default function EncuestadorCampesinosScreen() {
  const { token, user } = useAuthStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const currentUserId = user?.id ?? '';
  const currentCouncilId = user?.consejo_id ?? null;
  const [items, setItems] = useState<CampesinoRecord[]>([]);
  const [consejos, setConsejos] = useState<ConsejoRecord[]>([]);
  const [genderOptions, setGenderOptions] = useState(GENDER_OPTIONS);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<CampesinoFormState>(defaultForm(user?.consejo_id));
  const [syncedCount, setSyncedCount] = useState(0);
  const [offlineSavedCount, setOfflineSavedCount] = useState(0);

  const load = async () => {
    if (!token || !user || !currentUserId) return;
    const all = await loadCampesinosForEncuestador(token, currentUserId);
    setItems(all);
  };

  useEffect(() => {
    load().catch((error) => Alert.alert('Error', error.message || 'No se pudo cargar campesinos'));
  }, [token, currentUserId]);

  useEffect(() => {
    if (!token) return;

    listConsejos(token)
      .then(setConsejos)
      .catch(() => setConsejos([]));

    listGeneros(token)
      .then((data: GeneroRecord[]) => {
        const options = data.map((item) => ({ label: item.tipo_gen, value: item.tipo_gen }));
        setGenderOptions(options.length ? options : GENDER_OPTIONS);
      })
      .catch(() => setGenderOptions(GENDER_OPTIONS));
  }, [token]);

  const consejoOptions = useMemo(
    () => consejos.map((item) => ({
      label: item.nombre,
      value: String(item.id),
      description: item.municipio,
    })),
    [consejos],
  );

  const consejoNameById = useMemo(
    () => new Map(consejos.map((item) => [item.id, item.nombre] as const)),
    [consejos],
  );

  useFocusEffect(
    React.useCallback(() => {
      if (!token) {
        return () => undefined;
      }

      flushQueuedCampesinoCreates(token)
        .then(async (campesinoCount) => {
          setOfflineSavedCount(campesinoCount);
          const formCount = await flushQueuedSubmissions(token);
          setSyncedCount(formCount);
          await load();
        })
        .catch(() => undefined);

      return () => undefined;
    }, [token, user?.id]),
  );

  const filtered = useMemo(() => {
    const text = search.toLowerCase();
    return items.filter((item) => item.nombre.toLowerCase().includes(text) || item.cedula.toLowerCase().includes(text));
  }, [items, search]);

  const save = async () => {
    if (!token || !user || !currentUserId) return;
    if (form.cedulaMode !== 'none' && !form.cedula) {
      Alert.alert('Validación', 'La cédula es obligatoria cuando se selecciona un tipo');
      return;
    }

    if (!form.nombre) {
      Alert.alert('Validación', 'Cédula y nombre son obligatorios');
      return;
    }

    const cedulaValue = buildCedulaValue(form.cedulaMode, form.cedula);

    const payload: CampesinoPayload = {
      nombre: form.nombre.trim(),
      apellido: toOptionalString(form.apellido),
      telefono: toOptionalString(form.telefono),
      correo: toOptionalString(form.correo),
      fecha_nacimiento: toOptionalIsoDate(form.fecha_nacimiento),
      estado_id: toOptionalNumber(form.estado_id),
      genero: toOptionalString(form.genero),
      municipio_id: toOptionalNumber(form.municipio_id),
      parroquia_id: toOptionalNumber(form.parroquia_id),
      direccion: toOptionalString(form.direccion),
      consejo_id: toOptionalString(form.consejo_id),
      creado_por: currentUserId,
      asignado_a: currentUserId,
      tiene_pendientes: form.tiene_pendientes,
    };

    if (cedulaValue) {
      payload.cedula = cedulaValue;
    }

    try {
      const result = await createCampesinoWithOfflineFallback(token, payload);
      setModal(false);
      setForm(defaultForm(currentCouncilId || undefined));
      await load();

      if (result.queuedOffline) {
        Alert.alert(
          'Guardado offline',
          'El campesino se registro sin internet y se sincronizara automaticamente cuando vuelva la conexion.',
        );
      }
    } catch (error: any) {
      Alert.alert('Error', getRequestErrorMessage(error, 'No se pudo crear campesino'));
    }
  };

  return (
    <View style={styles.container}>
      {syncedCount > 0 ? <Text style={styles.syncedText}>Se sincronizaron {syncedCount} formularios guardados offline.</Text> : null}
      {offlineSavedCount > 0 ? <Text style={styles.syncedText}>Se sincronizaron {offlineSavedCount} campesinos creados offline.</Text> : null}
      <RoleSectionHeader
        title="Campesinos"
        subtitle="Tus campesinos asignados"
        actions={
          <TouchableOpacity style={styles.primaryButton} onPress={() => setModal(true)}>
            <Text style={styles.primaryButtonText}>Registrar</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No hay campesinos asignados</Text>}
        renderItem={({ item }) => (
          <Card variant="elevated" padding="sm" style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={styles.avatarContainer}>
                <MaterialCommunityIcons name="account-group" size={36} color={Theme.colors.greenMedium} />
              </View>
              <View style={styles.itemTitleGroup}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('CampesinoDetail', { campesinoId: item.id })}
                >
                  <Text style={styles.itemTitle}>{item.nombre} {item.apellido || ''}</Text>
                  <Text style={styles.itemSubtitle}>Cédula {item.cedula}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.itemRight}>
                <StatusPill label={item.tiene_pendientes ? 'Pendientes' : 'Sin pendientes'} tone={item.tiene_pendientes ? 'warning' : 'success'} />
                <View style={styles.iconRow}>
                  <TouchableOpacity
                    disabled={!item.tiene_pendientes}
                    onPress={() => navigation.navigate('FormulariosPendientes', { campesinoId: item.id })}
                  >
                    <Text style={[styles.actionLink, !item.tiene_pendientes && styles.actionDisabled]}>
                      {item.tiene_pendientes ? 'Ver pendientes' : 'Completado'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <View style={styles.itemMetaRow}>
              <Text style={styles.metaLabel}>Consejo</Text>
              <Text style={styles.metaValue}>{item.consejo_nombre || (item.consejo_id ? consejoNameById.get(item.consejo_id) || item.consejo_id : '-')}</Text>
            </View>
          </Card>
        )}
      />

      <FormModalSheet visible={modal} title="Nuevo campesino" onClose={() => setModal(false)} onSave={save}>
              <View style={styles.filterRow}>
                {([
                  { key: 'none', label: 'No posee cédula' },
                  { key: 'venezolano', label: 'Venezolano' },
                  { key: 'foreign', label: 'Extranjero' },
                  { key: 'manual', label: 'Manual' },
                ] as const).map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.pill, form.cedulaMode === option.key && styles.pillActive]}
                    onPress={() => setForm((s) => ({ ...s, cedulaMode: option.key, cedula: option.key === 'none' ? '' : s.cedula }))}
                  >
                    <Text style={[styles.pillText, form.cedulaMode === option.key && styles.pillTextActive]}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {form.cedulaMode !== 'none' ? (
                <TextInput
                  value={form.cedula}
                  onChangeText={(value) => setForm((s) => ({ ...s, cedula: value }))}
                  style={styles.input}
                  placeholder={form.cedulaMode === 'venezolano' ? 'Ej: 31217665' : form.cedulaMode === 'foreign' ? 'Ej: 31217665' : 'Cédula'}
                  autoCapitalize="characters"
                />
              ) : null}
              <TextInput value={form.nombre} onChangeText={(value) => setForm((s) => ({ ...s, nombre: value }))} style={styles.input} placeholder="Nombre *" />
              <TextInput value={form.apellido} onChangeText={(value) => setForm((s) => ({ ...s, apellido: value }))} style={styles.input} placeholder="Apellido" />
              <TextInput value={form.telefono} onChangeText={(value) => setForm((s) => ({ ...s, telefono: value }))} style={styles.input} placeholder="Teléfono" keyboardType="phone-pad" />
              <TextInput value={form.correo} onChangeText={(value) => setForm((s) => ({ ...s, correo: value }))} style={styles.input} placeholder="Correo electrónico" autoCapitalize="none" keyboardType="email-address" />
              <DatePickerField label="Fecha de nacimiento" value={form.fecha_nacimiento} onChange={(value) => setForm((s) => ({ ...s, fecha_nacimiento: value }))} onClear={() => setForm((s) => ({ ...s, fecha_nacimiento: '' }))} />
              <OptionSelector
                label="Género"
                value={form.genero}
                options={genderOptions}
                onChange={(value) => setForm((s) => ({ ...s, genero: value }))}
                placeholder="Selecciona el género"
              />
              <LookupSelectField
                label="Consejo"
                value={form.consejo_id}
                options={consejoOptions}
                onChange={(value) => setForm((s) => ({ ...s, consejo_id: value }))}
                placeholder="Selecciona un consejo"
                searchPlaceholder="Buscar consejo..."
                allowClear
                clearLabel="Sin consejo asignado"
              />
              <StateMunicipioPicker
                estado={form.estado_nombre}
                municipio={form.municipio_nombre}
                parroquia={form.parroquia_nombre}
                onEstadoChange={(value) => setForm((s) => ({ ...s, estado_nombre: value, estado_id: '' }))}
                onMunicipioChange={(value) => setForm((s) => ({ ...s, municipio_nombre: value, municipio_id: '' }))}
                onParroquiaChange={(value) => setForm((s) => ({ ...s, parroquia_nombre: value, parroquia_id: '' }))}
                onSelectionChange={({ estadoId, estadoNombre, municipioId, municipioNombre, parroquiaId, parroquiaNombre }) => setForm((s) => ({
                  ...s,
                  estado_id: estadoId != null ? String(estadoId) : '',
                  estado_nombre: estadoNombre,
                  municipio_id: municipioId != null ? String(municipioId) : '',
                  municipio_nombre: municipioNombre,
                  parroquia_id: parroquiaId != null ? String(parroquiaId) : '',
                  parroquia_nombre: parroquiaNombre,
                }))}
              />
              <TextInput value={form.direccion} onChangeText={(value) => setForm((s) => ({ ...s, direccion: value }))} style={[styles.input, styles.textArea]} placeholder="Dirección" multiline numberOfLines={3} />
              <View style={styles.switchRow}>
                <Text>Tiene pendientes</Text>
                <Switch value={form.tiene_pendientes} onValueChange={(value) => setForm((s) => ({ ...s, tiene_pendientes: value }))} />
              </View>
      </FormModalSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#f5f7fb' },
  syncedText: { color: '#047857', fontWeight: '700', marginBottom: 10 },
  primaryButton: { backgroundColor: '#0f766e', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  smallButton: { backgroundColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
  smallButtonText: { color: '#1f2937', fontWeight: '700' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  pill: { backgroundColor: '#e2e8f0', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  pillActive: { backgroundColor: '#0f766e' },
  pillText: { color: '#1f2937', fontWeight: '700' },
  pillTextActive: { color: '#fff' },
  nameLink: { color: '#1d4ed8', fontWeight: '700' },
  actionLink: { color: '#1d4ed8', fontWeight: '700' },
  actionDisabled: { color: '#6b7280' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, marginBottom: 10 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  textAreaLarge: { minHeight: 130, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' },
  listContent: { paddingBottom: 120, gap: 10 },
  emptyText: { color: '#64748b', textAlign: 'center', paddingVertical: 24 },
  itemCard: { marginBottom: 8 },
  avatarContainer: { marginRight: 12 },
  itemHeader: { flexDirection: 'row', alignItems: 'center' },
  itemTitleGroup: { flex: 1 },
  itemTitle: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  itemSubtitle: { color: '#475569', marginTop: 2 },
  itemMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  metaLabel: { color: '#64748b', fontWeight: '600' },
  metaValue: { color: '#0f172a', fontWeight: '700' },
  itemRight: { marginLeft: 'auto', alignItems: 'flex-end', justifyContent: 'space-between' },
  iconRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  iconButton: { padding: 6 },
});

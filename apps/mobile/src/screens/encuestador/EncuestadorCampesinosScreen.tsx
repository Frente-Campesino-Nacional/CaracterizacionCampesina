import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

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
import { sharedFormStyles } from '../../styles/sharedFormStyles';
import { CampesinoPayload, CampesinoRecord, ConsejoRecord, GeneroRecord, createCampesino, listCampesinos, listConsejos, listGeneros } from '../../services/adminService';
import { flushQueuedSubmissions, getFormulariosActivos, getPendingFormularios } from '../../services/encuestadorFormService';
import {
  createCampesinoWithOfflineFallback,
  flushQueuedCampesinoCreates,
  loadCampesinosForEncuestador,
} from '../../services/encuestadorCampesinoOfflineService';
import { showErrorAlert, showSuccessAlert } from '../../utils/humanizerUtils';
import { useAuthStore } from '../../store/authStore';
import { syncAllOfflineData } from '../../services/offlineSyncManager';
import { syncEncuestadorData } from '../../services/encuestadorSyncService';

type RootStackParamList = {

  CampesinoDetail: { campesinoId: string };
  FormulariosPendientes: { campesinoId: string };
};

type CampesinoFormState = {
  cedulaMode: 'foreign' | 'venezolano' | 'none';
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

export default function EncuestadorCampesinosScreen() {
  const { token, user } = useAuthStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const currentUserId = user?.id ?? '';
  const currentCouncilId = user?.consejo_id ?? null;
  const [items, setItems] = useState<CampesinoRecord[]>([]);
  const [consejos, setConsejos] = useState<ConsejoRecord[]>([]);
  const [genderOptions, setGenderOptions] = useState(GENDER_OPTIONS);
  const [search, setSearch] = useState('');
  const [pendientesFilter, setPendientesFilter] = useState<'all' | 'pendientes' | 'sin_pendientes'>('all');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<CampesinoFormState>(defaultForm(user?.consejo_id));
  const [syncedCount, setSyncedCount] = useState(0);
  const [offlineSavedCount, setOfflineSavedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const handleManualSync = async () => {
    if (!token || !user?.id || syncing) return;
    setSyncing(true);
    try {
      await syncEncuestadorData(token, user.id, true);
      await load();
    } finally {
      setSyncing(false);
    }
  };

  // Photo state
  const [photoSource, setPhotoSource] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string>('');
  const [photoMimeType, setPhotoMimeType] = useState<string>('');
  const [photoFileName, setPhotoFileName] = useState<string>('');

  const processImageAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    let base64Data = asset.base64 || '';
    if (!base64Data && asset.uri) {
      try {
        base64Data = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } catch {
        // fallback
      }
    }
    setPhotoSource(asset.uri);
    setPhotoBase64(base64Data);
    setPhotoMimeType(asset.mimeType || 'image/jpeg');
    setPhotoFileName(asset.fileName || 'foto-perfil.jpg');
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showErrorAlert('Se requieren permisos de galería para seleccionar fotos.', 'Permiso denegado');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: false,
    });

    if (result.canceled || !result.assets.length) return;
    const asset = result.assets[0];
    if (asset) await processImageAsset(asset);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showErrorAlert('Se requieren permisos de cámara para tomar fotos con el dispositivo.', 'Permiso denegado');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: false,
    });

    if (result.canceled || !result.assets.length) return;
    const asset = result.assets[0];
    if (asset) await processImageAsset(asset);
  };

  const clearPhoto = () => {
    setPhotoSource(null);
    setPhotoBase64('');
    setPhotoMimeType('');
    setPhotoFileName('');
  };

  const load = async () => {
    if (!token || !user || !currentUserId) return;
    const all = await loadCampesinosForEncuestador(token, currentUserId);
    setItems(all);
  };

  useEffect(() => {
    load().catch(() => undefined);
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

      // Cargar e interpretar metadata local inmediatamente al enfocar la pantalla
      load();

      syncAllOfflineData(token)
        .then(async (res) => {
          if (res.syncedCampesinos > 0 || res.syncedForms > 0) {
            await load();
          }
        })
        .catch(() => undefined);

      return () => undefined;
    }, [token, user?.id]),
  );

  const filtered = useMemo(() => {
    const text = search.toLowerCase();
    return items.filter((item) => {
      const byPendientes =
        pendientesFilter === 'all'
          ? true
          : pendientesFilter === 'pendientes'
          ? Boolean(item.tiene_pendientes)
          : !item.tiene_pendientes;
      const byText = item.nombre.toLowerCase().includes(text) || item.cedula.toLowerCase().includes(text);
      return byPendientes && byText;
    });
  }, [items, search, pendientesFilter]);

  const save = async () => {
    if (!token || !user || !currentUserId) return;
    if (form.cedulaMode !== 'none' && !form.cedula) {
      showErrorAlert('Por favor ingresa el número de cédula.', 'Campo obligatorio');
      return;
    }

    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;

    if (!form.nombre.trim()) {
      showErrorAlert('El nombre del campesino es un campo obligatorio (*).', 'Campo obligatorio');
      return;
    }

    if (!nameRegex.test(form.nombre.trim())) {
      showErrorAlert('El nombre del campesino solo debe contener letras y espacios.', 'Nombre inválido');
      return;
    }

    if (form.apellido && form.apellido.trim() && !nameRegex.test(form.apellido.trim())) {
      showErrorAlert('El apellido del campesino solo debe contener letras y espacios.', 'Apellido inválido');
      return;
    }

    const correoTrimmed = form.correo ? form.correo.trim().toLowerCase() : undefined;
    if (correoTrimmed) {
      if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(correoTrimmed)) {
        showErrorAlert('El correo electrónico debe pertenecer al dominio @gmail.com (ejemplo: usuario@gmail.com).', 'Correo inválido');
        return;
      }
    }

    const telefonoTrimmed = form.telefono ? form.telefono.trim() : undefined;
    if (telefonoTrimmed) {
      const cleanPhone = telefonoTrimmed.replace(/[\s\-()+]/g, '');
      if (cleanPhone.length < 7 || cleanPhone.length > 15 || !/^\+?\d+$/.test(telefonoTrimmed.replace(/[\s\-()]/g, ''))) {
        showErrorAlert('El número telefónico no es válido. Debe contener entre 7 y 15 dígitos (ejemplo: 04141234567).', 'Teléfono inválido');
        return;
      }
    }


    const cedulaValue = buildCedulaValue(form.cedulaMode, form.cedula);

    const payload: CampesinoPayload = {
      nombre: form.nombre.trim(),
      apellido: toOptionalString(form.apellido),
      telefono: toOptionalString(form.telefono),
      correo: correoTrimmed,

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
      const result = await createCampesinoWithOfflineFallback(token, payload, {
        photoBase64: photoBase64 || undefined,
        photoMimeType: photoMimeType || undefined,
        photoFileName: photoFileName || undefined,
        photoSource: photoSource || undefined,
      });

      setModal(false);
      setForm(defaultForm(currentCouncilId || undefined));
      clearPhoto();
      await load();

      if (result.queuedOffline) {
        showSuccessAlert(
          'Guardado Local (Sin Internet)',
          'El campesino se registró de forma local en tu dispositivo y se sincronizará automáticamente al recuperar la conexión.'
        );
      } else {
        showSuccessAlert(
          'Campesino Registrado',
          `El campesino ${form.nombre} ${form.apellido || ''} ha sido registrado exitosamente en el sistema.`
        );
      }
    } catch (error: any) {
      showErrorAlert(error, 'No se pudo registrar la información del campesino');
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
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: Theme.colors.greenDark, flexDirection: 'row', alignItems: 'center' }]}
              onPress={handleManualSync}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 4 }} />
              ) : (
                <MaterialCommunityIcons name="cloud-sync" size={18} color="#ffffff" style={{ marginRight: 4 }} />
              )}
              <Text style={styles.primaryButtonText}>{syncing ? 'Cargando...' : 'Sincronizar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setModal(true)}>
              <Text style={styles.primaryButtonText}>Registrar</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar por cédula o nombre" />

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.pill, pendientesFilter === 'all' && styles.pillActive]}
          onPress={() => setPendientesFilter('all')}
        >
          <Text style={[styles.pillText, pendientesFilter === 'all' && styles.pillTextActive]}>Todos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pill, pendientesFilter === 'pendientes' && styles.pillActive]}
          onPress={() => setPendientesFilter('pendientes')}
        >
          <Text style={[styles.pillText, pendientesFilter === 'pendientes' && styles.pillTextActive]}>Con pendientes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pill, pendientesFilter === 'sin_pendientes' && styles.pillActive]}
          onPress={() => setPendientesFilter('sin_pendientes')}
        >
          <Text style={[styles.pillText, pendientesFilter === 'sin_pendientes' && styles.pillTextActive]}>Sin pendientes</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No hay campesinos asignados</Text>}
        renderItem={({ item }) => {
          const isLocalPending = String(item.id).includes('temp') || String(item.cedula).includes('LOCAL-') || String(item.cedula).includes('Guardado localmente') || Boolean((item.metadata as any)?.offline_local);

          return (
            <Card variant="elevated" padding="sm" style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.avatarContainer}>
                  {item.foto_url ? (
                    <Image source={{ uri: item.foto_url }} style={styles.listAvatarImage} />
                  ) : (
                    <MaterialCommunityIcons name="account-group" size={36} color={Theme.colors.greenMedium} />
                  )}
                </View>

                <View style={styles.itemTitleGroup}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('CampesinoDetail', { campesinoId: item.id })}
                  >
                    <Text style={styles.itemTitle}>{item.nombre} {item.apellido || ''}</Text>
                    {isLocalPending ? (
                      <StatusPill label="Guardado localmente esperando sincronización" tone="warning" />
                    ) : (
                      <Text style={styles.itemSubtitle}>Cédula {item.cedula}</Text>
                    )}
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
          );
        }}
      />

      <FormModalSheet visible={modal} title="Nuevo campesino" onClose={() => setModal(false)} onSave={save}>
              <View style={styles.filterRow}>
                {([
                  { key: 'none', label: 'No posee cédula' },
                  { key: 'venezolano', label: 'Venezolano' },
                  { key: 'foreign', label: 'Extranjero' },
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
                label="Sexo"
                value={form.genero}
                options={genderOptions}
                onChange={(value) => setForm((s) => ({ ...s, genero: value }))}
                placeholder="Selecciona el sexo"
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
              
              <View style={styles.photoCard}>
                <Text style={styles.photoCardTitle}>Foto de perfil</Text>
                <View style={styles.photoPreviewRow}>
                  <View style={styles.photoPreviewCircle}>
                    {photoSource ? (
                      <Image source={{ uri: photoSource }} style={styles.photoPreviewImage} />
                    ) : (
                      <MaterialCommunityIcons name="account-circle" size={44} color={Theme.colors.greenDark} />
                    )}
                  </View>
                  <View style={styles.photoPreviewActions}>
                    <TouchableOpacity style={styles.photoActionButton} onPress={takePhoto}>
                      <Text style={styles.photoActionButtonText}>📷 Tomar foto</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.photoActionButton, styles.photoActionButtonSecondary]} onPress={pickPhoto}>
                      <Text style={[styles.photoActionButtonText, { color: Theme.colors.greenDark }]}>🖼️ Galería</Text>
                    </TouchableOpacity>
                    {photoSource ? (
                      <TouchableOpacity style={[styles.photoActionButton, styles.photoActionButtonSecondary]} onPress={clearPhoto}>
                        <Text style={[styles.photoActionButtonText, { color: Theme.colors.error }]}>Quitar</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>


              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 4 }}>
                <Switch value={form.tiene_pendientes} onValueChange={(value) => setForm((s) => ({ ...s, tiene_pendientes: value }))} />
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#0f172a' }}>Tiene pendientes</Text>
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
  listAvatarImage: { width: 36, height: 36, borderRadius: 18 },
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
  photoCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  photoCardTitle: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8 },
  photoPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photoPreviewCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  photoPreviewImage: { width: 48, height: 48, borderRadius: 24 },
  photoPreviewActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  photoActionButton: { backgroundColor: Theme.colors.greenDark, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  photoActionButtonSecondary: { backgroundColor: '#e2e8f0' },
  photoActionButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
});


import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

import DatePickerField from '../../components/DatePickerField';
import SearchBar from '../../components/SearchBar';
import { Card, OptionSelector, GENDER_OPTIONS, LookupSelectField, RoleSectionHeader, FormModalSheet, StatusPill } from '../../components';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import StateMunicipioPicker from '../../components/StateMunicipioPicker';
import { Theme } from '../../theme/colors';
import { CampesinoPayload, CampesinoProfileImageRecord, CampesinoRecord, ConsejoRecord, GeneroRecord, UsuarioRecord, createCampesino, deleteCampesino, deleteCampesinoProfileImage, getCampesinoProfileImage, listCampesinos, listConsejos, listGeneros, listUsuarios, saveCampesinoProfileImage, updateCampesino } from '../../services/adminService';
import { useAuthStore } from '../../store/authStore';
import { exportTableToPdf } from '../../utils/pdfExport';
import { exportTableToExcelCsv } from '../../utils/excelExport';
import { showErrorAlert, showSuccessAlert } from '../../utils/humanizerUtils';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { sharedFormStyles } from '../../styles/sharedFormStyles';

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
  creado_por: string;
  asignado_a: string;
  tiene_pendientes: boolean;
};

function defaultCampesinoForm(currentUserId?: string): CampesinoFormState {
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
    consejo_id: '',
    creado_por: currentUserId != null ? String(currentUserId) : '',
    asignado_a: '',
    tiene_pendientes: false,
  };
}

function buildCedulaValue(mode: CampesinoFormState['cedulaMode'], value: string): string | undefined {
  const trimmed = value.trim().replace(/\s+/g, '').toUpperCase();
  if (mode === 'none') return undefined;
  if (mode === 'venezolano') return trimmed ? `V-${trimmed.replace(/^V-/, '')}` : undefined;
  if (mode === 'foreign') return trimmed ? `E-${trimmed.replace(/^E-/, '')}` : undefined;
  return undefined;
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

export default function AdminCampesinosScreen() {
  const { token, user } = useAuthStore();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [items, setItems] = useState<CampesinoRecord[]>([]);
  const [consejos, setConsejos] = useState<ConsejoRecord[]>([]);
  const [users, setUsers] = useState<UsuarioRecord[]>([]);
  const [genderOptions, setGenderOptions] = useState(GENDER_OPTIONS);
  const [search, setSearch] = useState('');
  const [consejoFilter, setConsejoFilter] = useState<string | 'all'>('all');
  const [pendientesFilter, setPendientesFilter] = useState<'all' | 'pendientes' | 'sin_pendientes'>('all');
  const [consejoDropdownOpen, setConsejoDropdownOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<CampesinoRecord | null>(null);
  const [form, setForm] = useState<CampesinoFormState>(defaultCampesinoForm());
  const [photoSource, setPhotoSource] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState('');
  const [photoMimeType, setPhotoMimeType] = useState('');
  const [photoFileName, setPhotoFileName] = useState('');
  const [photoState, setPhotoState] = useState<'keep' | 'new' | 'delete'>('keep');

  const load = async () => {
    if (!token) return;
    const [campesinos, consejosList, usuariosList] = await Promise.all([
      listCampesinos(token),
      listConsejos(token),
      listUsuarios(token),
    ]);
    setItems(campesinos);
    setConsejos(consejosList);
    setUsers(usuariosList);
  };

  useNavigation();
  const { useFocusEffect } = require('@react-navigation/native');

  useFocusEffect(
    React.useCallback(() => {
      load().catch(() => undefined);
      return () => undefined;
    }, [token])
  );

  useEffect(() => {
    if (!token) return;

    listGeneros(token)
      .then((data: GeneroRecord[]) => {
        const options = data.map((item) => ({ label: item.tipo_gen, value: item.tipo_gen }));
        setGenderOptions(options.length ? options : GENDER_OPTIONS);
      })
      .catch(() => setGenderOptions(GENDER_OPTIONS));
  }, [token]);

  const filtered = useMemo(() => {
    const text = search.toLowerCase();
    return items.filter((item) => {
      const byConsejo = consejoFilter === 'all' || item.consejo_id === consejoFilter;
      const byPendientes =
        pendientesFilter === 'all'
          ? true
          : pendientesFilter === 'pendientes'
          ? Boolean(item.tiene_pendientes)
          : !item.tiene_pendientes;
      const byText = item.nombre.toLowerCase().includes(text) || item.cedula.toLowerCase().includes(text);
      return byConsejo && byPendientes && byText;
    });
  }, [consejoFilter, pendientesFilter, items, search]);

  const selectedConsejoLabel =
    consejoFilter === 'all'
      ? 'Todos los consejos'
      : consejos.find((item) => item.id === consejoFilter)?.nombre || 'Seleccionar consejo';

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

  const userNameById = useMemo(
    () => new Map(users.map((item) => [item.id, `${item.nombre} ${item.apellido}`] as const)),
    [users],
  );

  const userOptions = useMemo(
    () => users.map((item) => ({
      label: `${item.nombre} ${item.apellido}`,
      value: String(item.id),
      description: `${item.email} • ${item.rol}`,
    })),
    [users],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(defaultCampesinoForm(user?.id));
    setPhotoSource(null);
    setPhotoBase64('');
    setPhotoMimeType('');
    setPhotoFileName('');
    setPhotoState('keep');
    setModal(true);
  };

  const loadPhoto = async (campesinoId: string) => {
    if (!token) return;

    try {
      const response = await getCampesinoProfileImage(token, campesinoId);
      const image = response.imagen;
      if (!image) {
        setPhotoSource(null);
        setPhotoBase64('');
        setPhotoMimeType('');
        setPhotoFileName('');
        setPhotoState('keep');
        return;
      }

      if (image.image_url) {
        setPhotoSource(image.image_url);
      } else if (image.image_base64 && image.content_type) {
        setPhotoSource(`data:${image.content_type};base64,${image.image_base64}`);
      } else {
        setPhotoSource(null);
      }

      setPhotoBase64(image.image_base64 || '');
      setPhotoMimeType(image.content_type || '');
      setPhotoFileName(image.file_name || '');
      setPhotoState('keep');
    } catch {
      setPhotoSource(null);
      setPhotoBase64('');
      setPhotoMimeType('');
      setPhotoFileName('');
      setPhotoState('keep');
    }
  };

  const openEdit = (item: CampesinoRecord) => {
    setEditing(item);
    setForm({
      cedulaMode: item.cedula ? (/^V-/.test(item.cedula) ? 'venezolano' : /^E-/.test(item.cedula) ? 'foreign' : 'none') : 'none',
      cedula: item.cedula,
      nombre: item.nombre,
      apellido: item.apellido || '',
      telefono: item.telefono || '',
      correo: item.correo || '',
      fecha_nacimiento: item.fecha_nacimiento ? String(item.fecha_nacimiento).slice(0, 10) : '',
      genero: item.genero || '',
      estado_id: (item as any).estado_id != null ? String((item as any).estado_id) : '',
      estado_nombre: item.estado || '',
      municipio_id: (item as any).municipio_id != null ? String((item as any).municipio_id) : '',
      municipio_nombre: item.municipio || '',
      parroquia_id: (item as any).parroquia_id != null ? String((item as any).parroquia_id) : '',
      parroquia_nombre: item.parroquia || '',
      direccion: item.direccion || '',
      consejo_id: item.consejo_id || '',
      creado_por: item.creado_por != null ? String(item.creado_por) : String(user?.id ?? ''),
      asignado_a: item.asignado_a || '',
      tiene_pendientes: Boolean(item.tiene_pendientes),
    });
    void loadPhoto(item.id);
    setModal(true);
  };

  const save = async () => {
    if (!token) return;
    if (!form.nombre) {
      showErrorAlert('El nombre del campesino es un campo obligatorio (*).', 'Campo requerido');
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
      creado_por: editing ? toOptionalString(form.creado_por) : (user?.id ?? toOptionalString(form.creado_por)),
      asignado_a: toOptionalString(form.asignado_a),
      tiene_pendientes: form.tiene_pendientes,
    };

    if (cedulaValue) {
      payload.cedula = cedulaValue;
    }

    try {
      let targetId: string;
      if (editing) {
        const updated = await updateCampesino(token, editing.id, payload);
        targetId = editing.id;
        setItems((prev) => prev.map((item) => (item.id === targetId ? ({ ...item, ...updated } as CampesinoRecord) : item)));
      } else {
        const created = await createCampesino(token, payload);
        targetId = created.id;
        setItems((prev) => [created, ...prev]);
      }

      if (photoState === 'new' && photoBase64) {
        await saveCampesinoProfileImage(token, targetId, {
          content_type: photoMimeType || 'image/jpeg',
          file_name: photoFileName || 'foto-perfil.jpg',
          image_base64: photoBase64,
        });
      } else if (photoState === 'delete') {
        await deleteCampesinoProfileImage(token, targetId);
      }

      setModal(false);
      void load();
      showSuccessAlert(
        editing ? 'Campesino Actualizado' : 'Campesino Registrado',
        editing
          ? `Los datos de ${form.nombre} ${form.apellido || ''} se actualizaron correctamente.`
          : `El campesino ${form.nombre} ${form.apellido || ''} ha sido registrado exitosamente.`
      );
    } catch (error: any) {
      showErrorAlert(error, 'No se pudo guardar la información del campesino');
    }
  };

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
    setPhotoState('new');
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
    setPhotoState(editing ? 'delete' : 'keep');
  };



  const remove = (item: CampesinoRecord) => {
    if (!token) return;
    Alert.alert('Eliminar campesino', `¿Estás seguro de eliminar al campesino ${item.nombre} ${item.apellido || ''}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCampesino(token, item.id);
            await load();
            showSuccessAlert('Campesino Eliminado', `El campesino ${item.nombre} ${item.apellido || ''} fue eliminado con éxito.`);
          } catch (error: any) {
            showErrorAlert(error, 'No se pudo eliminar el registro del campesino');
          }
        },
      },
    ]);
  };

  const exportPdf = async () => {
    try {
      const fileUri = await exportTableToPdf({
        title: 'Reporte de Campesinos',
        subtitle: 'CensoCampesino - Administración',
        filePrefix: 'campesinos',
        filters: [
          { label: 'Búsqueda', value: search || 'Sin filtro' },
          {
            label: 'Consejo',
            value:
              consejoFilter === 'all'
                ? 'Todos'
                : consejos.find((item) => item.id === consejoFilter)?.nombre || String(consejoFilter),
          },
        ],
        columns: [
          { key: 'cedula', title: 'Cédula' },
          { key: 'nombre', title: 'Nombre' },
          { key: 'consejo', title: 'Consejo' },
          { key: 'pendientes', title: 'Pendientes' },
        ],
        rows: filtered.map((item) => ({
          cedula: item.cedula,
          nombre: `${item.nombre} ${item.apellido || ''}`,
          consejo: item.consejo_id ? consejoNameById.get(item.consejo_id) || item.consejo_id : '-',
          pendientes: item.tiene_pendientes ? 'Sí' : 'No',
        })),
      });

      Alert.alert('PDF generado', `Archivo guardado en:\n${fileUri}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No se pudo generar el PDF';
      Alert.alert('Error', message);
    }
  };

  return (
    <View style={sharedFormStyles.pageContainer}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar por cédula o nombre" />
      <View style={styles.dropdownWrapper}>
        <Text style={styles.dropdownLabel}>Filtrar por consejo</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setConsejoDropdownOpen((value) => !value)}
          activeOpacity={0.85}
        >
          <Text style={styles.dropdownButtonText} numberOfLines={1}>{selectedConsejoLabel}</Text>
          <MaterialCommunityIcons
            name={consejoDropdownOpen ? 'chevron-up' : 'chevron-down'}
            size={22}
            color="#0f172a"
          />
        </TouchableOpacity>
        {consejoDropdownOpen ? (
          <View style={styles.dropdownMenu}>
            <TouchableOpacity
              style={[styles.dropdownOption, consejoFilter === 'all' && styles.dropdownOptionActive]}
              onPress={() => {
                setConsejoFilter('all');
                setConsejoDropdownOpen(false);
              }}
            >
              <Text style={[styles.dropdownOptionText, consejoFilter === 'all' && styles.dropdownOptionTextActive]}>
                Todos los consejos
              </Text>
            </TouchableOpacity>
            {consejos.map((consejo) => (
              <TouchableOpacity
                key={consejo.id}
                style={[styles.dropdownOption, consejoFilter === consejo.id && styles.dropdownOptionActive]}
                onPress={() => {
                  setConsejoFilter(consejo.id);
                  setConsejoDropdownOpen(false);
                }}
              >
                <Text style={[styles.dropdownOptionText, consejoFilter === consejo.id && styles.dropdownOptionTextActive]}>{consejo.nombre}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
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
      <RoleSectionHeader
        title="Campesinos"
        subtitle="Visualiza y administra los registros de campesinos."
        actions={
          <>
            <TouchableOpacity style={sharedFormStyles.smallButton} onPress={exportPdf}>
              <Text style={sharedFormStyles.smallButtonText}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={sharedFormStyles.primaryButton} onPress={openCreate}>
              <Text style={sharedFormStyles.primaryButtonText}>Registrar</Text>
            </TouchableOpacity>
          </>
        }
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={sharedFormStyles.listContent}
        ListEmptyComponent={<Text style={sharedFormStyles.emptyText}>No hay campesinos</Text>}
        renderItem={({ item }) => (
            <TouchableOpacity onPress={() => navigation.navigate('BasicRecordDetail', { recordType: 'campesino', recordId: item.id })} activeOpacity={0.85}>
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
                <Text style={styles.itemTitle}>{item.nombre} {item.apellido || ''}</Text>
                <Text style={styles.itemSubtitle}>Cédula {item.cedula}</Text>
              </View>
              <View style={styles.itemRight}>
                <StatusPill label={item.tiene_pendientes ? 'Pendientes' : 'Sin pendientes'} tone={item.tiene_pendientes ? 'warning' : 'success'} />
                <View style={styles.iconRow}>
                  <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconButton}>
                    <MaterialCommunityIcons name="pencil" size={20} color={Theme.colors.greenDark} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => remove(item)} style={styles.iconButton}>
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color={Theme.colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <View style={styles.itemMetaRow}>
              <Text style={styles.metaLabel}>Consejo</Text>
              <Text style={styles.metaValue}>{item.consejo_id ? consejoNameById.get(item.consejo_id) || item.consejo_id : '-'}</Text>
            </View>
          </Card>
          </TouchableOpacity>
        )}
      />

      <FormModalSheet
        visible={modal}
        title={editing ? 'Editar campesino' : 'Nuevo campesino'}
        onClose={() => setModal(false)}
        onSave={save}
      >
              <View style={styles.filterRow}>
                {([
                  { key: 'none', label: 'No posee cédula' },
                  { key: 'venezolano', label: 'Venezolano' },
                  { key: 'foreign', label: 'Extranjero' },
                ] as const).map((option) => (
                  <TouchableOpacity key={option.key} style={[styles.pill, form.cedulaMode === option.key && styles.pillActive]} onPress={() => setForm((s) => ({ ...s, cedulaMode: option.key, cedula: option.key === 'none' ? '' : s.cedula }))}>
                    <Text style={[styles.pillText, form.cedulaMode === option.key && styles.pillTextActive]}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {form.cedulaMode !== 'none' ? (
                <TextInput value={form.cedula} onChangeText={(value) => setForm((s) => ({ ...s, cedula: value }))} style={sharedFormStyles.input} placeholder={form.cedulaMode === 'venezolano' ? 'Ej: 31217665' : form.cedulaMode === 'foreign' ? 'Ej: 31217665' : 'Cédula'} autoCapitalize="characters" />
              ) : null}
              <TextInput value={form.nombre} onChangeText={(value) => setForm((s) => ({ ...s, nombre: value }))} style={sharedFormStyles.input} placeholder="Nombre *" />
              <TextInput value={form.apellido} onChangeText={(value) => setForm((s) => ({ ...s, apellido: value }))} style={sharedFormStyles.input} placeholder="Apellido" />
              <TextInput value={form.telefono} onChangeText={(value) => setForm((s) => ({ ...s, telefono: value }))} style={sharedFormStyles.input} placeholder="Teléfono" keyboardType="phone-pad" />
              <TextInput value={form.correo} onChangeText={(value) => setForm((s) => ({ ...s, correo: value }))} style={sharedFormStyles.input} placeholder="Correo electrónico" autoCapitalize="none" keyboardType="email-address" />
              <DatePickerField label="Fecha de nacimiento" value={form.fecha_nacimiento} onChange={(value) => setForm((s) => ({ ...s, fecha_nacimiento: value }))} onClear={() => setForm((s) => ({ ...s, fecha_nacimiento: '' }))} />
              <OptionSelector
                label="Sexo"
                value={form.genero}
                options={genderOptions}
                onChange={(value) => setForm((s) => ({ ...s, genero: value }))}
                placeholder="Selecciona el sexo del campesino"
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
              <TextInput value={form.direccion} onChangeText={(value) => setForm((s) => ({ ...s, direccion: value }))} style={[sharedFormStyles.input, sharedFormStyles.textArea]} placeholder="Dirección" multiline numberOfLines={3} />
              <LookupSelectField
                label="Asignado a"
                value={form.asignado_a}
                options={userOptions}
                onChange={(value) => setForm((s) => ({ ...s, asignado_a: value }))}
                placeholder="Selecciona un usuario"
                searchPlaceholder="Buscar usuario..."
                allowClear
                clearLabel="Sin asignar"
              />
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
              <View style={styles.readOnlyInfoBox}>
                <Text style={styles.readOnlyLabel}>Creado por</Text>
                <Text style={styles.readOnlyValue}>
                  {editing
                    ? (form.creado_por ? (userNameById.get(form.creado_por) || (/^[0-9a-f-]{36}$/i.test(form.creado_por) ? 'N/A' : form.creado_por)) : 'N/A')
                    : ([user?.nombre, user?.apellido].filter(Boolean).join(' ') || 'Usuario')}

                </Text>
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
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: '#dfe6f2' },
  pillActive: { backgroundColor: '#1d4ed8' },
  pillText: { color: '#1f2937', fontWeight: '600' },
  pillTextActive: { color: '#fff' },
  link: { color: '#1d4ed8', fontWeight: '700' },
  danger: { color: '#b91c1c' },
  dropdownWrapper: { marginBottom: 12, position: 'relative' },
  dropdownLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  dropdownButton: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dropdownButtonText: { color: '#0f172a', fontWeight: '700', flex: 1 },
  dropdownMenu: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#fff',
    maxHeight: 220,
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dropdownOptionActive: { backgroundColor: '#dbeafe' },
  dropdownOptionText: { color: '#1f2937', fontWeight: '600' },
  dropdownOptionTextActive: { color: '#1d4ed8', fontWeight: '700' },
  readOnlyInfoBox: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, marginBottom: 10, backgroundColor: '#f8fafc' },
  readOnlyLabel: { color: '#475569', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  readOnlyValue: { color: '#0f172a', fontWeight: '700' },
  photoCard: { borderWidth: 1, borderColor: '#dbe4f0', borderRadius: 12, padding: 12, marginBottom: 10, backgroundColor: '#f8fbff' },
  photoCardTitle: { color: '#0f172a', fontWeight: '800', marginBottom: 10 },
  photoPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photoPreviewCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dbe4f0',
  },
  photoPreviewImage: { width: '100%', height: '100%' },
  photoPreviewActions: { flex: 1, gap: 8 },
  photoActionButton: { backgroundColor: Theme.colors.greenDark, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  photoActionButtonSecondary: { backgroundColor: Theme.colors.mediumGray },
  photoActionButtonText: { color: Theme.colors.white, fontWeight: '700' },
  textAreaLarge: { minHeight: 130, textAlignVertical: 'top' },
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
});

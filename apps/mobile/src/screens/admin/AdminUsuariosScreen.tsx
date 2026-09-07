import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DatePickerField from '../../components/DatePickerField';
import SearchBar from '../../components/SearchBar';
import { Card, OptionSelector, GENDER_OPTIONS, LookupSelectField, RoleSectionHeader, FormModalSheet, StatusPill } from '../../components';
import { Theme } from '../../theme/colors';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import StateMunicipioPicker from '../../components/StateMunicipioPicker';
import { ConsejoRecord, GeneroRecord, RoleRecord, UserRole, UsuarioPayload, UsuarioRecord, createUsuario, deleteUsuario, deleteUsuarioProfileImage, getUsuarioProfileImage, listConsejos, listGeneros, listRoles, listUsuarios, saveUsuarioProfileImage, updateUsuario } from '../../services/adminService';
import { useAuthStore } from '../../store/authStore';
import { exportTableToPdf } from '../../utils/pdfExport';
import { exportTableToExcelCsv } from '../../utils/excelExport';
import { showErrorAlert, showSuccessAlert } from '../../utils/humanizerUtils';
import { sharedFormStyles } from '../../styles/sharedFormStyles';

const roleFallbacks: Array<'admin' | 'encuestador'> = ['admin', 'encuestador'];

type UserFormState = {
  cedulaMode: 'foreign' | 'venezolano' | 'none';

  email: string;
  password: string;
  rol: UserRole;
  cedula: string;
  nombre: string;
  apellido: string;
  numero_telefono: string;
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
  activo: boolean;
};

function defaultUserForm(): UserFormState {
  return {
    cedulaMode: 'none',
    email: '',
    password: '',
    rol: 'encuestador',
    cedula: '',
    nombre: '',
    apellido: '',
    numero_telefono: '',
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
    activo: true,
  };
}



function toOptionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function buildCedulaValue(mode: UserFormState['cedulaMode'], value: string): string | undefined {
  const trimmed = value.trim().replace(/\s+/g, '').toUpperCase();
  if (mode === 'none') return undefined;
  if (mode === 'venezolano') return trimmed ? `V-${trimmed.replace(/^V-/, '')}` : undefined;
  if (mode === 'foreign') return trimmed ? `E-${trimmed.replace(/^E-/, '')}` : undefined;
  return trimmed || undefined;
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

export default function AdminUsuariosScreen() {
  const { token } = useAuthStore();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [items, setItems] = useState<UsuarioRecord[]>([]);
  const [consejos, setConsejos] = useState<ConsejoRecord[]>([]);
  const [roleOptions, setRoleOptions] = useState<UserRole[]>(roleFallbacks);
  const [genderOptions, setGenderOptions] = useState(GENDER_OPTIONS);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<UsuarioRecord | null>(null);
  const [form, setForm] = useState<UserFormState>(defaultUserForm());
  const [photoSource, setPhotoSource] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState('');
  const [photoMimeType, setPhotoMimeType] = useState('');
  const [photoFileName, setPhotoFileName] = useState('');
  const [photoState, setPhotoState] = useState<'keep' | 'new' | 'delete'>('keep');

  const load = async () => {
    if (!token) return;
    const data = await listUsuarios(token);
    setItems(data);
  };

  const { useFocusEffect } = require('@react-navigation/native');

  useFocusEffect(
    React.useCallback(() => {
      load().catch(() => undefined);
      return () => undefined;
    }, [token])
  );

  useEffect(() => {
    if (!token) return;

    listConsejos(token)
      .then(setConsejos)
      .catch(() => setConsejos([]));

    listRoles(token)
      .then((data: RoleRecord[]) => {
        const options = data.map((item) => item.tipo_rol);
        setRoleOptions(options.length ? options : roleFallbacks);
      })
      .catch(() => setRoleOptions(roleFallbacks));

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
      const byRole = roleFilter === 'all' || item.rol === roleFilter;
      const byText =
        item.nombre.toLowerCase().includes(text) ||
        item.apellido.toLowerCase().includes(text) ||
        item.email.toLowerCase().includes(text);
      return byRole && byText;
    });
  }, [items, roleFilter, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(defaultUserForm());
    setPhotoSource(null);
    setPhotoBase64('');
    setPhotoMimeType('');
    setPhotoFileName('');
    setPhotoState('keep');
    setModal(true);
  };

  const openEdit = (item: UsuarioRecord) => {
    setEditing(item);
    setForm({
      cedulaMode: item.cedula ? (/^V-/.test(item.cedula) ? 'venezolano' : /^E-/.test(item.cedula) ? 'foreign' : 'none') : 'none',

      cedula: item.cedula || '',
      email: item.email,
      password: '',
      rol: item.rol,
      nombre: item.nombre,
      apellido: item.apellido,
      numero_telefono: item.numero_telefono || '',
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
      activo: item.activo,
    });
    void loadPhoto(item.id);
    setModal(true);
  };

  const save = async () => {
    if (!token) return;
    if (!form.email || !form.nombre || !form.apellido || (!editing && !form.password)) {
      showErrorAlert('Por favor completa todos los campos requeridos (*).', 'Campos obligatorios');
      return;
    }

    const emailTrimmed = form.email.trim().toLowerCase();
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(emailTrimmed)) {
      showErrorAlert('El correo electrónico debe pertenecer al dominio @gmail.com (ejemplo: usuario@gmail.com).', 'Correo inválido');
      return;
    }

    const telefonoTrimmed = form.numero_telefono ? form.numero_telefono.trim() : undefined;
    if (telefonoTrimmed) {
      const cleanPhone = telefonoTrimmed.replace(/[\s\-()+]/g, '');
      if (cleanPhone.length < 7 || cleanPhone.length > 15 || !/^\+?\d+$/.test(telefonoTrimmed.replace(/[\s\-()]/g, ''))) {
        showErrorAlert('El número telefónico no es válido. Debe contener entre 7 y 15 dígitos (ejemplo: 04141234567).', 'Teléfono inválido');
        return;
      }
    }


    const payload: UsuarioPayload = {
      email: emailTrimmed,
      password: toOptionalString(form.password),
      cedula: buildCedulaValue(form.cedulaMode, form.cedula),
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      rol: form.rol,
      numero_telefono: toOptionalString(form.numero_telefono),
      fecha_nacimiento: toOptionalIsoDate(form.fecha_nacimiento),
      estado_id: toOptionalNumber(form.estado_id),
      genero: toOptionalString(form.genero),
      municipio_id: toOptionalNumber(form.municipio_id),
      parroquia_id: toOptionalNumber(form.parroquia_id),
      direccion: toOptionalString(form.direccion),
      consejo_id: toOptionalString(form.consejo_id),
      activo: form.activo,
    };


    try {
      let targetId: string;
      if (editing) {
        const updated = await updateUsuario(token, editing.id, payload);
        targetId = editing.id;
        setItems((prev) => prev.map((item) => (item.id === targetId ? ({ ...item, ...updated } as UsuarioRecord) : item)));
      } else {
        const created = await createUsuario(token, payload);
        targetId = created.id;
        setItems((prev) => [created, ...prev]);
      }

      if (photoState === 'new' && photoBase64) {
        await saveUsuarioProfileImage(token, targetId, {
          content_type: photoMimeType || 'image/jpeg',
          file_name: photoFileName || 'foto-perfil.jpg',
          image_base64: photoBase64,
        });
      } else if (photoState === 'delete') {
        await deleteUsuarioProfileImage(token, targetId);
      }

      setModal(false);
      void load();
      showSuccessAlert(
        editing ? 'Usuario Actualizado' : 'Usuario Registrado',
        editing
          ? `Los datos de ${form.nombre} ${form.apellido} han sido actualizados correctamente.`
          : `El usuario ${form.nombre} ${form.apellido} ha sido registrado exitosamente.`
      );
    } catch (error: any) {
      showErrorAlert(error, 'No se pudo guardar la información del usuario');
    }

  };

  const remove = (item: UsuarioRecord) => {
    if (!token) return;
    Alert.alert('Eliminar usuario', `¿Estás seguro de eliminar a ${item.nombre} ${item.apellido}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteUsuario(token, item.id);
            await load();
            showSuccessAlert('Usuario Eliminado', `El usuario ${item.nombre} ${item.apellido} ha sido eliminado del sistema.`);
          } catch (error: any) {
            showErrorAlert(error, 'No se pudo eliminar el usuario');
          }
        },
      },
    ]);
  };


  const exportPdf = async () => {
    try {
      const fileUri = await exportTableToPdf({
        title: 'Reporte de Usuarios',
        subtitle: 'CensoCampesino - Administración',
        filePrefix: 'usuarios',
        filters: [
          { label: 'Búsqueda', value: search || 'Sin filtro' },
          { label: 'Rol', value: roleFilter === 'all' ? 'Todos' : roleFilter },
        ],
        columns: [
          { key: 'nombre', title: 'Nombre' },
          { key: 'email', title: 'Email' },
          { key: 'rol', title: 'Rol' },
          { key: 'activo', title: 'Activo' },
        ],
        rows: filtered.map((item) => ({
          nombre: `${item.nombre} ${item.apellido}`,
          email: item.email,
          rol: item.rol,
          activo: item.activo ? 'Sí' : 'No',
        })),
      });

      Alert.alert('PDF generado', `Archivo guardado en:\n${fileUri}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No se pudo generar el PDF';
      Alert.alert('Error', message);
    }
  };

  const consejoOptions = useMemo(
    () => consejos.map((item) => ({
      label: item.nombre,
      value: String(item.id),
      description: item.municipio,
    })),
    [consejos],
  );

  const loadPhoto = async (userId: string) => {
    if (!token) return;

    try {
      const response = await getUsuarioProfileImage(token, userId);
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


  return (
    <View style={sharedFormStyles.pageContainer}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar por nombre o email" />
      <View style={styles.filterRow}>
        {['all', ...roleOptions].map((role) => (
          <TouchableOpacity
            key={role}
            style={[styles.pill, roleFilter === role && styles.pillActive]}
            onPress={() => setRoleFilter(role)}
          >
            <Text style={[styles.pillText, roleFilter === role && styles.pillTextActive]}>{role}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <RoleSectionHeader
        title="Usuarios"
        subtitle="Gestiona acceso, roles y estado de los usuarios."
        actions={
          <>
            <TouchableOpacity style={sharedFormStyles.smallButton} onPress={exportPdf}>
              <Text style={sharedFormStyles.smallButtonText}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={sharedFormStyles.primaryButton} onPress={openCreate}>
              <Text style={sharedFormStyles.primaryButtonText}>Crear</Text>
            </TouchableOpacity>
          </>
        }
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={sharedFormStyles.listContent}
        ListEmptyComponent={<Text style={sharedFormStyles.emptyText}>No hay usuarios</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('BasicRecordDetail', { recordType: 'usuario', recordId: item.id })} activeOpacity={0.85}>
          <Card variant="elevated" padding="sm" style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={styles.avatarContainer}>
                {item.foto_url ? (
                  <Image source={{ uri: item.foto_url }} style={styles.listAvatarImage} />
                ) : (
                  <MaterialCommunityIcons name="account-circle" size={40} color="#2563eb" />
                )}
              </View>

              <View style={styles.itemTitleGroup}>
                <Text style={styles.itemTitle}>{item.nombre} {item.apellido}</Text>
                <Text style={styles.itemSubtitle}>{item.email}</Text>
              </View>
              <View style={styles.itemRight}> 
                <StatusPill label={item.activo ? 'Activo' : 'Inactivo'} tone={item.activo ? 'success' : 'danger'} />
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
              <Text style={styles.metaLabel}>Rol</Text>
              <Text style={styles.metaValue}>{item.rol}</Text>
            </View>
          </Card>
          </TouchableOpacity>
        )}
      />

      <FormModalSheet
        visible={modal}
        title={editing ? 'Editar usuario' : 'Crear usuario'}
        onClose={() => setModal(false)}
        onSave={save}
      >
              <TextInput value={form.email} onChangeText={(value) => setForm((s) => ({ ...s, email: value }))} style={sharedFormStyles.input} placeholder="Email *" autoCapitalize="none" />

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
              <TextInput
                value={form.password}
                onChangeText={(value) => setForm((s) => ({ ...s, password: value }))}
                style={sharedFormStyles.input}
                placeholder={editing ? 'Contraseña (opcional en edición)' : 'Contraseña *'}
                secureTextEntry
              />
              <TextInput value={form.nombre} onChangeText={(value) => setForm((s) => ({ ...s, nombre: value }))} style={sharedFormStyles.input} placeholder="Nombre *" />
              <TextInput value={form.apellido} onChangeText={(value) => setForm((s) => ({ ...s, apellido: value }))} style={sharedFormStyles.input} placeholder="Apellido *" />
              <View style={styles.filterRow}>
                {roleOptions.map((role) => (
                  <TouchableOpacity key={role} style={[styles.pill, form.rol === role && styles.pillActive]} onPress={() => setForm((s) => ({ ...s, rol: role }))}>
                    <Text style={[styles.pillText, form.rol === role && styles.pillTextActive]}>{role}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput value={form.numero_telefono} onChangeText={(value) => setForm((s) => ({ ...s, numero_telefono: value }))} style={sharedFormStyles.input} placeholder="Número de teléfono" keyboardType="phone-pad" />
              <DatePickerField label="Fecha de nacimiento" value={form.fecha_nacimiento} onChange={(value) => setForm((s) => ({ ...s, fecha_nacimiento: value }))} onClear={() => setForm((s) => ({ ...s, fecha_nacimiento: '' }))} />
              <OptionSelector
                label="Sexo"
                value={form.genero}
                options={genderOptions}
                onChange={(value) => setForm((s) => ({ ...s, genero: value }))}
                placeholder="Selecciona el sexo del usuario"
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
                label="Consejo"
                value={form.consejo_id}
                options={consejoOptions}
                onChange={(value) => setForm((s) => ({ ...s, consejo_id: value }))}
                placeholder="Selecciona un consejo"
                searchPlaceholder="Buscar consejo..."
                allowClear
                clearLabel="Sin consejo asignado"
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
              <View style={sharedFormStyles.switchRow}>

                <Text>Activo</Text>
                <Switch value={form.activo} onValueChange={(value) => setForm((s) => ({ ...s, activo: value }))} />
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
  textArea: { minHeight: 80, textAlignVertical: 'top' },
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
  itemCard: { marginBottom: 8 },
  avatarContainer: { marginRight: 12 },
  listAvatarImage: { width: 40, height: 40, borderRadius: 20 },
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

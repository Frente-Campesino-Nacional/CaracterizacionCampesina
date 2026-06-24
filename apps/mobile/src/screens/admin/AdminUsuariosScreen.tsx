import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DatePickerField from '../../components/DatePickerField';
import SearchBar from '../../components/SearchBar';
import { Card, OptionSelector, GENDER_OPTIONS, LookupSelectField } from '../../components';
import { Theme } from '../../theme/colors';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import StateMunicipioPicker from '../../components/StateMunicipioPicker';
import { ConsejoRecord, GeneroRecord, RoleRecord, UserRole, UsuarioPayload, UsuarioRecord, createUsuario, deleteUsuario, deleteUsuarioProfileImage, getUsuarioProfileImage, listConsejos, listGeneros, listRoles, listUsuarios, saveUsuarioProfileImage, updateUsuario } from '../../services/adminService';
import { useAuthStore } from '../../store/authStore';
import { exportTableToPdf } from '../../utils/pdfExport';

const roleFallbacks: Array<'admin' | 'encuestador'> = ['admin', 'encuestador'];

type UserFormState = {
  cedulaMode: 'manual' | 'foreign' | 'venezolano' | 'none';
  email: string;
  password: string;
  rol: UserRole;
  cedula: string;
  nombre: string;
  apellido: string;
  numero_telefono: string;
  fecha_nacimiento: string;
  genero: string;
  estado: string;
  municipio: string;
  direccion: string;
  consejo_id: string;
  activo: boolean;
  creado_en: string;
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
    estado: '',
    municipio: '',
    direccion: '',
    consejo_id: '',
    activo: true,
    creado_en: '',
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

  useEffect(() => {
    load().catch((error) => Alert.alert('Error', error.message || 'No se pudo cargar usuarios'));
  }, [token]);

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
      cedulaMode: item.cedula ? (/^V-/.test(item.cedula) ? 'venezolano' : /^E-/.test(item.cedula) ? 'foreign' : 'manual') : 'none',
      cedula: item.cedula || '',
      email: item.email,
      password: '',
      rol: item.rol,
      nombre: item.nombre,
      apellido: item.apellido,
      numero_telefono: item.numero_telefono || '',
      fecha_nacimiento: item.fecha_nacimiento ? String(item.fecha_nacimiento).slice(0, 10) : '',
      genero: item.genero || '',
      estado: item.estado || '',
      municipio: item.municipio || '',
      direccion: item.direccion || '',
      consejo_id: item.consejo_id != null ? String(item.consejo_id) : '',
      activo: item.activo,
      creado_en: item.creado_en ? String(item.creado_en) : '',
    });
    void loadPhoto(item.id);
    setModal(true);
  };

  const save = async () => {
    if (!token) return;
    if (!form.email || !form.nombre || !form.apellido || (!editing && !form.password)) {
      Alert.alert('Validación', 'Completa los campos requeridos');
      return;
    }

    const payload: UsuarioPayload = {
      email: form.email.trim(),
      password: toOptionalString(form.password),
      cedula: buildCedulaValue(form.cedulaMode, form.cedula),
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      rol: form.rol,
      numero_telefono: toOptionalString(form.numero_telefono),
      fecha_nacimiento: toOptionalIsoDate(form.fecha_nacimiento),
      genero: toOptionalString(form.genero),
      estado: toOptionalString(form.estado),
      municipio: toOptionalString(form.municipio),
      direccion: toOptionalString(form.direccion),
      consejo_id: toOptionalNumber(form.consejo_id),
      activo: form.activo,
      creado_en: toOptionalString(form.creado_en),
    };

    try {
      if (editing) {
        await updateUsuario(token, editing.id, payload);
      } else {
        const created = await createUsuario(token, payload);
        if (photoState === 'new' && photoBase64 && photoMimeType) {
          await saveUsuarioProfileImage(token, created.id, {
            content_type: photoMimeType,
            file_name: photoFileName || undefined,
            image_base64: photoBase64,
          });
        }
        if (photoState === 'delete') {
          await deleteUsuarioProfileImage(token, created.id);
        }
      }
      if (editing && photoState === 'new' && photoBase64 && photoMimeType) {
        await saveUsuarioProfileImage(token, editing.id, {
          content_type: photoMimeType,
          file_name: photoFileName || undefined,
          image_base64: photoBase64,
        });
      }
      if (editing && photoState === 'delete') {
        await deleteUsuarioProfileImage(token, editing.id);
      }
      setModal(false);
      await load();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar');
    }
  };

  const remove = (item: UsuarioRecord) => {
    if (!token) return;
    Alert.alert('Eliminar', `¿Eliminar a ${item.nombre} ${item.apellido}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteUsuario(token, item.id);
            await load();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo eliminar');
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

  const loadPhoto = async (userId: number) => {
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

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    const asset = result.assets[0];
    if (!asset) {
      return;
    }
    setPhotoSource(asset.uri);
    setPhotoBase64(asset.base64 || '');
    setPhotoMimeType(asset.mimeType || 'image/jpeg');
    setPhotoFileName(asset.fileName || 'foto-perfil.jpg');
    setPhotoState('new');
  };

  const clearPhoto = () => {
    setPhotoSource(null);
    setPhotoBase64('');
    setPhotoMimeType('');
    setPhotoFileName('');
    setPhotoState(editing ? 'delete' : 'keep');
  };

  return (
    <View style={styles.container}>
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
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrapper}>
          <Text style={styles.sectionTitle}>Usuarios</Text>
          <Text style={styles.sectionSubtitle}>Gestiona acceso, roles y estado de los usuarios.</Text>
        </View>
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.smallButton} onPress={exportPdf}>
            <Text style={styles.smallButtonText}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={openCreate}>
            <Text style={styles.primaryButtonText}>Crear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No hay usuarios</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('BasicRecordDetail', { recordType: 'usuario', recordId: item.id })} activeOpacity={0.85}>
          <Card variant="elevated" padding="sm" style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={styles.avatarContainer}>
                <MaterialCommunityIcons name="account-circle" size={40} color="#2563eb" />
              </View>
              <View style={styles.itemTitleGroup}>
                <Text style={styles.itemTitle}>{item.nombre} {item.apellido}</Text>
                <Text style={styles.itemSubtitle}>{item.email}</Text>
              </View>
              <View style={styles.itemRight}> 
                <View style={[styles.statusBadge, item.activo ? styles.statusActive : styles.statusInactive]}>
                  <Text style={styles.statusText}>{item.activo ? 'Activo' : 'Inactivo'}</Text>
                </View>
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

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView>
              <Text style={styles.modalTitle}>{editing ? 'Editar usuario' : 'Crear usuario'}</Text>
              <TextInput value={form.email} onChangeText={(value) => setForm((s) => ({ ...s, email: value }))} style={styles.input} placeholder="Email *" autoCapitalize="none" />
              <View style={styles.filterRow}>
                {([
                  { key: 'none', label: 'No posee cédula' },
                  { key: 'venezolano', label: 'Venezolano' },
                  { key: 'foreign', label: 'Extranjero' },
                  { key: 'manual', label: 'Manual' },
                ] as const).map((option) => (
                  <TouchableOpacity key={option.key} style={[styles.pill, form.cedulaMode === option.key && styles.pillActive]} onPress={() => setForm((s) => ({ ...s, cedulaMode: option.key, cedula: option.key === 'none' ? '' : s.cedula }))}>
                    <Text style={[styles.pillText, form.cedulaMode === option.key && styles.pillTextActive]}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {form.cedulaMode !== 'none' ? (
                <TextInput value={form.cedula} onChangeText={(value) => setForm((s) => ({ ...s, cedula: value }))} style={styles.input} placeholder={form.cedulaMode === 'venezolano' ? 'Ej: 31217665' : form.cedulaMode === 'foreign' ? 'Ej: 31217665' : 'Cédula'} autoCapitalize="characters" />
              ) : null}
              <TextInput
                value={form.password}
                onChangeText={(value) => setForm((s) => ({ ...s, password: value }))}
                style={styles.input}
                placeholder={editing ? 'Contraseña (opcional en edición)' : 'Contraseña *'}
                secureTextEntry
              />
              <TextInput value={form.nombre} onChangeText={(value) => setForm((s) => ({ ...s, nombre: value }))} style={styles.input} placeholder="Nombre *" />
              <TextInput value={form.apellido} onChangeText={(value) => setForm((s) => ({ ...s, apellido: value }))} style={styles.input} placeholder="Apellido *" />
              <View style={styles.filterRow}>
                {roleOptions.map((role) => (
                  <TouchableOpacity key={role} style={[styles.pill, form.rol === role && styles.pillActive]} onPress={() => setForm((s) => ({ ...s, rol: role }))}>
                    <Text style={[styles.pillText, form.rol === role && styles.pillTextActive]}>{role}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput value={form.numero_telefono} onChangeText={(value) => setForm((s) => ({ ...s, numero_telefono: value }))} style={styles.input} placeholder="Número de teléfono" keyboardType="phone-pad" />
              <DatePickerField label="Fecha de nacimiento" value={form.fecha_nacimiento} onChange={(value) => setForm((s) => ({ ...s, fecha_nacimiento: value }))} onClear={() => setForm((s) => ({ ...s, fecha_nacimiento: '' }))} />
              <OptionSelector
                label="Género"
                value={form.genero}
                options={genderOptions}
                onChange={(value) => setForm((s) => ({ ...s, genero: value }))}
                placeholder="Selecciona el género del usuario"
              />
              <StateMunicipioPicker
                estado={form.estado}
                municipio={form.municipio}
                onEstadoChange={(value) => setForm((s) => ({ ...s, estado: value }))}
                onMunicipioChange={(value) => setForm((s) => ({ ...s, municipio: value }))}
              />
              <TextInput value={form.direccion} onChangeText={(value) => setForm((s) => ({ ...s, direccion: value }))} style={[styles.input, styles.textArea]} placeholder="Dirección" multiline numberOfLines={3} />
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
                    <TouchableOpacity style={styles.photoActionButton} onPress={pickPhoto}>
                      <Text style={styles.photoActionButtonText}>Elegir foto</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.photoActionButton, styles.photoActionButtonSecondary]} onPress={clearPhoto}>
                      <Text style={styles.photoActionButtonText}>Quitar foto</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <TextInput value={form.creado_en} onChangeText={(value) => setForm((s) => ({ ...s, creado_en: value }))} style={styles.input} placeholder="Creado en (ISO opcional)" autoCapitalize="none" />
              <View style={styles.switchRow}>
                <Text>Activo</Text>
                <Switch value={form.activo} onValueChange={(value) => setForm((s) => ({ ...s, activo: value }))} />
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setModal(false)}><Text>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity onPress={save}><Text style={styles.save}>Guardar</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#f5f7fb' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 },
  headerTextWrapper: { flex: 1 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  sectionSubtitle: { color: '#475569', marginTop: 4 },
  actionButtonsRow: { flexDirection: 'row', gap: 10 },
  primaryButton: { backgroundColor: '#0f766e', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  smallButton: { backgroundColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
  smallButtonText: { color: '#1f2937', fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: '#dfe6f2' },
  pillActive: { backgroundColor: '#1d4ed8' },
  pillText: { color: '#1f2937', fontWeight: '600' },
  pillTextActive: { color: '#fff' },
  link: { color: '#1d4ed8', fontWeight: '700' },
  danger: { color: '#b91c1c' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, marginBottom: 10 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  save: { color: '#0f766e', fontWeight: '700' },
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
  listContent: { paddingBottom: 20, gap: 10 },
  emptyText: { color: '#64748b', textAlign: 'center', padding: 24 },
  itemCard: { marginBottom: 8 },
  avatarContainer: { marginRight: 12 },
  itemHeader: { flexDirection: 'row', alignItems: 'center' },
  itemTitleGroup: { flex: 1 },
  itemTitle: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  itemSubtitle: { color: '#475569', marginTop: 2 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusActive: { backgroundColor: '#dcfce7' },
  statusInactive: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 12, fontWeight: '700', color: '#1f2937' },
  itemMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  metaLabel: { color: '#64748b', fontWeight: '600' },
  metaValue: { color: '#0f172a', fontWeight: '700' },
  itemRight: { marginLeft: 'auto', alignItems: 'flex-end', justifyContent: 'space-between' },
  iconRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  iconButton: { padding: 6 },
});

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DataTable from '../../components/DataTable';
import SearchBar from '../../components/SearchBar';
import StateMunicipioPicker from '../../components/StateMunicipioPicker';
import { ConsejoPayload, ConsejoRecord, UsuarioRecord, createConsejo, deleteConsejo, listConsejos, listUsuarios, updateConsejo } from '../../services/adminService';
import { useAuthStore } from '../../store/authStore';
import { exportTableToPdf } from '../../utils/pdfExport';
import { LookupSelectField } from '../../components';
import { sharedFormStyles } from '../../styles/sharedFormStyles';

function toOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function AdminConsejosScreen() {
  const { token } = useAuthStore();
  const [items, setItems] = useState<ConsejoRecord[]>([]);
  const [users, setUsers] = useState<UsuarioRecord[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<ConsejoRecord | null>(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '', estado_id: '', estado_nombre: '', municipio_id: '', municipio_nombre: '', parroquia_id: '', parroquia_nombre: '', encargado_tipo: 'admin', encargado_id: '' });

  const load = async () => {
    if (!token) return;
    setItems(await listConsejos(token));
  };

  useEffect(() => {
    load().catch((error) => Alert.alert('Error', error.message || 'No se pudo cargar consejos'));
  }, [token]);

  useEffect(() => {
    if (!token) return;

    listUsuarios(token)
      .then(setUsers)
      .catch(() => setUsers([]));
  }, [token]);

  const filtered = useMemo(() => {
    const text = search.toLowerCase();
    return items.filter((item) => item.nombre.toLowerCase().includes(text) || item.municipio.toLowerCase().includes(text));
  }, [items, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ nombre: '', descripcion: '', estado_id: '', estado_nombre: '', municipio_id: '', municipio_nombre: '', parroquia_id: '', parroquia_nombre: '', encargado_tipo: 'admin', encargado_id: '' });
    setModal(true);
  };

  const openEdit = (item: ConsejoRecord) => {
    setEditing(item);
    setForm({ nombre: item.nombre, descripcion: item.descripcion || '', estado_id: '', estado_nombre: item.estado, municipio_id: '', municipio_nombre: item.municipio, parroquia_id: '', parroquia_nombre: item.parroquia || '', encargado_tipo: item.encargado_tipo, encargado_id: item.encargado_id ? String(item.encargado_id) : '' });
    setModal(true);
  };

  const save = async () => {
    if (!token) return;
    if (!form.nombre || !form.estado_nombre || !form.municipio_nombre || !form.parroquia_nombre) {
      Alert.alert('Validación', 'Completa los campos básicos del consejo');
      return;
    }

    const payload: ConsejoPayload = {
      nombre: form.nombre,
      descripcion: form.descripcion || undefined,
      estado_id: toOptionalNumber(form.estado_id),
      municipio_id: toOptionalNumber(form.municipio_id),
      parroquia_id: toOptionalNumber(form.parroquia_id),
      encargado_tipo: form.encargado_tipo,
      encargado_id: form.encargado_id || undefined,
    };

    try {
      if (editing) {
        await updateConsejo(token, editing.id, payload);
      } else {
        await createConsejo(token, payload);
      }
      setModal(false);
      await load();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar');
    }
  };

  const remove = (item: ConsejoRecord) => {
    if (!token) return;
    Alert.alert('Eliminar', `¿Eliminar consejo ${item.nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteConsejo(token, item.id); await load(); } },
    ]);
  };

  const exportPdf = async () => {
    try {
      const fileUri = await exportTableToPdf({
        title: 'Reporte de Consejos',
        subtitle: 'CensoCampesino - Administración',
        filePrefix: 'consejos',
        filters: [{ label: 'Búsqueda', value: search || 'Sin filtro' }],
        columns: [
          { key: 'nombre', title: 'Nombre' },
          { key: 'estado', title: 'Estado' },
          { key: 'municipio', title: 'Municipio' },
          { key: 'encargado', title: 'Encargado' },
        ],
        rows: filtered.map((item) => ({
          nombre: item.nombre,
          estado: item.estado,
          municipio: item.municipio,
          encargado: userNameById.get(item.encargado_id) || item.encargado_id,
        })),
      });

      Alert.alert('PDF generado', `Archivo guardado en:\n${fileUri}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No se pudo generar el PDF';
      Alert.alert('Error', message);
    }
  };

  const userOptions = useMemo(
    () => users.map((item) => ({
      label: `${item.nombre} ${item.apellido}`,
      value: String(item.id),
      description: `${item.email} • ${item.rol}`,
    })),
    [users],
  );

  const userNameById = useMemo(
    () => new Map(users.map((item) => [item.id, `${item.nombre} ${item.apellido}`] as const)),
    [users],
  );

  const updateEncargado = (value: string) => {
    const selectedUser = users.find((item) => String(item.id) === value);
    setForm((current) => ({
      ...current,
      encargado_id: value,
      encargado_tipo: selectedUser?.rol || current.encargado_tipo,
    }));
  };

  return (
    <View style={sharedFormStyles.pageContainer}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar por nombre o municipio" />
      <TouchableOpacity style={sharedFormStyles.primaryButton} onPress={openCreate}><Text style={sharedFormStyles.primaryButtonText}>Crear Consejo</Text></TouchableOpacity>
      <TouchableOpacity style={styles.pdfButton} onPress={exportPdf}><Text style={styles.pdfButtonText}>Descargar PDF</Text></TouchableOpacity>

      <DataTable
        data={filtered}
        columns={[
          { key: 'nombre', title: 'Nombre', flex: 1.4, render: (item) => <Text>{item.nombre}</Text> },
          { key: 'estado', title: 'Estado', render: (item) => <Text>{item.estado}</Text> },
          { key: 'municipio', title: 'Municipio', render: (item) => <Text>{item.municipio}</Text> },
          { key: 'encargado', title: 'Encargado', render: (item) => <Text>{userNameById.get(item.encargado_id) || item.encargado_id || 'Sin encargado'}</Text> },
          {
            key: 'acciones',
            title: 'Acciones',
            flex: 1.2,
            render: (item) => (
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => openEdit(item)}><Text style={sharedFormStyles.linkText}>Editar</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => remove(item)}><Text style={[sharedFormStyles.linkText, sharedFormStyles.dangerText]}>Eliminar</Text></TouchableOpacity>
              </View>
            ),
          },
        ]}
      />

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={sharedFormStyles.modalOverlay}>
          <View style={sharedFormStyles.modalCard}>
            <Text style={sharedFormStyles.modalTitle}>{editing ? 'Editar consejo' : 'Nuevo consejo'}</Text>
            <TextInput value={form.nombre} onChangeText={(value) => setForm((s) => ({ ...s, nombre: value }))} style={sharedFormStyles.input} placeholder="Nombre" />
            <TextInput value={form.descripcion} onChangeText={(value) => setForm((s) => ({ ...s, descripcion: value }))} style={sharedFormStyles.input} placeholder="Descripción" />
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
            <LookupSelectField
              label="Encargado"
              value={form.encargado_id}
              options={userOptions}
              onChange={updateEncargado}
              placeholder="Selecciona un encargado"
              searchPlaceholder="Buscar usuario..."
            />
            <Text style={styles.helperText}>Tipo de encargado: {form.encargado_tipo || 'N/A'}</Text>
            <View style={sharedFormStyles.modalActions}>
              <TouchableOpacity onPress={() => setModal(false)}><Text>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={save}><Text style={sharedFormStyles.saveText}>Guardar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pdfButton: { backgroundColor: '#334155', padding: 10, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  pdfButtonText: { color: '#fff', fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10 },
  helperText: { color: '#475569', marginBottom: 10, fontWeight: '600' },
});

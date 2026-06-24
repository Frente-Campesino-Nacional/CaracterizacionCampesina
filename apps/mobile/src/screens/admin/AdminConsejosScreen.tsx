import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DataTable from '../../components/DataTable';
import SearchBar from '../../components/SearchBar';
import StateMunicipioPicker from '../../components/StateMunicipioPicker';
import { ConsejoPayload, ConsejoRecord, UsuarioRecord, createConsejo, deleteConsejo, listConsejos, listUsuarios, updateConsejo } from '../../services/adminService';
import { useAuthStore } from '../../store/authStore';
import { exportTableToPdf } from '../../utils/pdfExport';
import { LookupSelectField } from '../../components';

export default function AdminConsejosScreen() {
  const { token } = useAuthStore();
  const [items, setItems] = useState<ConsejoRecord[]>([]);
  const [users, setUsers] = useState<UsuarioRecord[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<ConsejoRecord | null>(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '', estado: '', municipio: '', encargado_tipo: 'admin', encargado_id: '' });

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
    setForm({ nombre: '', descripcion: '', estado: '', municipio: '', encargado_tipo: 'admin', encargado_id: '' });
    setModal(true);
  };

  const openEdit = (item: ConsejoRecord) => {
    setEditing(item);
    setForm({ nombre: item.nombre, descripcion: item.descripcion || '', estado: item.estado, municipio: item.municipio, encargado_tipo: item.encargado_tipo, encargado_id: String(item.encargado_id) });
    setModal(true);
  };

  const save = async () => {
    if (!token) return;
    if (!form.nombre || !form.estado || !form.municipio || !form.encargado_id) {
      Alert.alert('Validación', 'Completa todos los campos requeridos');
      return;
    }

    const payload: ConsejoPayload = {
      nombre: form.nombre,
      descripcion: form.descripcion || undefined,
      estado: form.estado,
      municipio: form.municipio,
      encargado_tipo: form.encargado_tipo,
      encargado_id: Number(form.encargado_id),
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
    <View style={styles.container}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar por nombre o municipio" />
      <TouchableOpacity style={styles.createButton} onPress={openCreate}><Text style={styles.createButtonText}>Crear Consejo</Text></TouchableOpacity>
      <TouchableOpacity style={styles.pdfButton} onPress={exportPdf}><Text style={styles.pdfButtonText}>Descargar PDF</Text></TouchableOpacity>

      <DataTable
        data={filtered}
        columns={[
          { key: 'nombre', title: 'Nombre', flex: 1.4, render: (item) => <Text>{item.nombre}</Text> },
          { key: 'estado', title: 'Estado', render: (item) => <Text>{item.estado}</Text> },
          { key: 'municipio', title: 'Municipio', render: (item) => <Text>{item.municipio}</Text> },
          { key: 'encargado', title: 'Encargado', render: (item) => <Text>{userNameById.get(item.encargado_id) || item.encargado_id}</Text> },
          {
            key: 'acciones',
            title: 'Acciones',
            flex: 1.2,
            render: (item) => (
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => openEdit(item)}><Text style={styles.link}>Editar</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => remove(item)}><Text style={[styles.link, styles.danger]}>Eliminar</Text></TouchableOpacity>
              </View>
            ),
          },
        ]}
      />

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Editar consejo' : 'Nuevo consejo'}</Text>
            <TextInput value={form.nombre} onChangeText={(value) => setForm((s) => ({ ...s, nombre: value }))} style={styles.input} placeholder="Nombre" />
            <TextInput value={form.descripcion} onChangeText={(value) => setForm((s) => ({ ...s, descripcion: value }))} style={styles.input} placeholder="Descripción" />
            <StateMunicipioPicker
              estado={form.estado}
              municipio={form.municipio}
              onEstadoChange={(value) => setForm((s) => ({ ...s, estado: value }))}
              onMunicipioChange={(value) => setForm((s) => ({ ...s, municipio: value }))}
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
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModal(false)}><Text>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={save}><Text style={styles.save}>Guardar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#f5f7fb' },
  createButton: { backgroundColor: '#0f766e', padding: 10, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  createButtonText: { color: '#fff', fontWeight: '700' },
  pdfButton: { backgroundColor: '#334155', padding: 10, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  pdfButtonText: { color: '#fff', fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10 },
  link: { color: '#1d4ed8', fontWeight: '700' },
  danger: { color: '#b91c1c' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, marginBottom: 10 },
  helperText: { color: '#475569', marginBottom: 10, fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  save: { color: '#0f766e', fontWeight: '700' },
});

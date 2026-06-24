import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card, Header } from '../../components';
import { Theme } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import { getCampesino, getUsuario, listConsejos, listUsuarios, CampesinoRecord, ConsejoRecord, UsuarioRecord } from '../../services/adminService';
import { isAdminRole } from '../../utils/roles';

type RootStackParamList = {
  BasicRecordDetail: { recordType: 'usuario' | 'campesino'; recordId: number };
};

type Props = NativeStackScreenProps<RootStackParamList, 'BasicRecordDetail'>;

export default function BasicRecordDetailScreen({ route }: Props) {
  const { token, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<UsuarioRecord | CampesinoRecord | null>(null);
  const [consejos, setConsejos] = useState<ConsejoRecord[]>([]);
  const [users, setUsers] = useState<UsuarioRecord[]>([]);

  const title = useMemo(() => (route.params.recordType === 'usuario' ? 'Detalle de Usuario' : 'Detalle de Campesino'), [route.params.recordType]);

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      try {
        setLoading(true);
        const data = route.params.recordType === 'usuario'
          ? await getUsuario(token, route.params.recordId)
          : await getCampesino(token, route.params.recordId);
        setRecord(data);
      } catch (error: any) {
        Alert.alert('Error', error.message || 'No se pudo cargar el detalle');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [route.params.recordId, route.params.recordType, token]);

  useEffect(() => {
    if (!token) return;

    Promise.all([listConsejos(token), listUsuarios(token)])
      .then(([consejosList, usersList]) => {
        setConsejos(consejosList);
        setUsers(usersList);
      })
      .catch(() => {
        setConsejos([]);
        setUsers([]);
      });
  }, [token]);

  const consejoNameById = useMemo(
    () => new Map(consejos.map((item) => [item.id, item.nombre] as const)),
    [consejos],
  );

  const userNameById = useMemo(
    () => new Map(users.map((item) => [item.id, `${item.nombre} ${item.apellido}`] as const)),
    [users],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.helperText}>Cargando detalle...</Text>
      </View>
    );
  }

  if (!record) {
    return (
      <View style={styles.center}>
        <Text style={styles.helperText}>No se encontró el registro.</Text>
      </View>
    );
  }

  const isUsuario = route.params.recordType === 'usuario';

  return (
    <View style={styles.container}>
      <Header title={title} subtitle={isUsuario ? 'Información básica del usuario' : 'Información básica del campesino'} showBorder />
      <ScrollView contentContainerStyle={styles.content}>
        <Card variant="elevated" padding="lg" style={styles.headerCard}>
          <MaterialCommunityIcons name={isUsuario ? 'account-circle' : 'account-group'} size={72} color={Theme.colors.greenDark} />
          <Text style={styles.nameText}>{record.nombre} {'apellido' in record && record.apellido ? record.apellido : ''}</Text>
          {'email' in record ? <Text style={styles.subText}>{record.email}</Text> : null}
          {'cedula' in record ? <Text style={styles.subText}>Cédula {record.cedula}</Text> : null}
        </Card>

        <Card variant="bordered" padding="lg" style={styles.detailCard}>
          {'cedula' in record ? <Field label="Cédula" value={record.cedula ?? 'N/A'} /> : null}
          {'email' in record ? <Field label="Email" value={record.email} /> : null}
          {'telefono' in record ? <Field label="Teléfono" value={record.telefono || 'N/A'} /> : null}
          {'correo' in record ? <Field label="Correo" value={record.correo || 'N/A'} /> : null}
          <Field label="Nombre" value={record.nombre} />
          {'apellido' in record ? <Field label="Apellido" value={record.apellido || 'N/A'} /> : null}
          {'rol' in record ? <Field label="Rol" value={record.rol} /> : null}
          {'consejo_id' in record ? <Field label="Consejo" value={'consejo_nombre' in record && record.consejo_nombre ? record.consejo_nombre : (record.consejo_id ? consejoNameById.get(record.consejo_id) || record.consejo_id : 'N/A')} /> : null}
          {'activo' in record ? <Field label="Estado" value={record.activo ? 'Activo' : 'Inactivo'} /> : null}
          {'tiene_pendientes' in record ? <Field label="Pendientes" value={record.tiene_pendientes ? 'Sí' : 'No'} /> : null}
        </Card>

        {isAdminRole(user?.rol) ? (
          <Card variant="bordered" padding="lg" style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Campos adicionales</Text>
            {'numero_telefono' in record ? <Field label="Teléfono" value={record.numero_telefono || 'N/A'} /> : null}
            {'fecha_nacimiento' in record ? <Field label="Fecha de nacimiento" value={record.fecha_nacimiento || 'N/A'} /> : null}
            {'genero' in record ? <Field label="Género" value={record.genero || 'N/A'} /> : null}
            {'estado' in record ? <Field label="Estado" value={record.estado || 'N/A'} /> : null}
            {'municipio' in record ? <Field label="Municipio" value={record.municipio || 'N/A'} /> : null}
            {'direccion' in record ? <Field label="Dirección" value={record.direccion || 'N/A'} /> : null}
            {'creado_por' in record ? <Field label="Creado por" value={record.creado_por ? userNameById.get(record.creado_por) || record.creado_por : 'N/A'} /> : null}
            {'asignado_a' in record ? <Field label="Asignado a" value={record.asignado_a ? userNameById.get(record.asignado_a) || record.asignado_a : 'N/A'} /> : null}
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{String(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.white },
  content: { padding: Theme.spacing.lg, gap: Theme.spacing.lg, paddingBottom: Theme.spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  helperText: { color: Theme.colors.mediumGray },
  headerCard: { alignItems: 'center', gap: Theme.spacing.sm },
  nameText: { fontSize: Theme.fontSize['2xl'], fontWeight: Theme.fontWeight.bold, color: Theme.colors.darkGray, textAlign: 'center' },
  subText: { color: Theme.colors.mediumGray, textAlign: 'center' },
  detailCard: { gap: Theme.spacing.sm },
  sectionTitle: { fontSize: Theme.fontSize.base, fontWeight: Theme.fontWeight.bold, color: Theme.colors.darkGray, marginBottom: Theme.spacing.sm },
  fieldRow: { marginBottom: Theme.spacing.md },
  fieldLabel: { color: Theme.colors.mediumGray, fontSize: Theme.fontSize.sm, marginBottom: Theme.spacing.xs },
  fieldValue: { color: Theme.colors.darkGray, fontSize: Theme.fontSize.base, fontWeight: Theme.fontWeight.semibold },
});
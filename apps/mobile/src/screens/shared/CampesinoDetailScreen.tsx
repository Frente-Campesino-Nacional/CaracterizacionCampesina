import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card, Button, Header, StatusPill } from '../../components';

import { Theme } from '../../theme/colors';
import { sharedScreenStyles } from '../../styles/sharedScreenStyles';
import { useAuthStore } from '../../store/authStore';
import { CampesinoRecord, ConsejoRecord, UsuarioRecord, getCampesino, listConsejos, listUsuarios } from '../../services/adminService';
import { isAdminRole } from '../../utils/roles';

type RootStackParamList = {
  CampesinoDetail: { campesinoId: string };
  FormulariosPendientes: { campesinoId: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'CampesinoDetail'>;

export default function CampesinoDetailScreen({ route, navigation }: Props) {
  const { token, user } = useAuthStore();
  const [campesino, setCampesino] = useState<CampesinoRecord | null>(null);
  const [consejos, setConsejos] = useState<ConsejoRecord[]>([]);
  const [users, setUsers] = useState<UsuarioRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        setLoading(true);
        const data = await getCampesino(token, route.params.campesinoId);
        setCampesino(data);
      } catch (error: any) {
        Alert.alert('Error', error.message || 'No se pudo cargar el campesino');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [route.params.campesinoId, token]);

  useFocusEffect(
    React.useCallback(() => {
      if (!token) {
        return () => undefined;
      }

      const reload = async () => {
        try {
          const data = await getCampesino(token, route.params.campesinoId);
          setCampesino(data);
        } catch (error: any) {
          Alert.alert('Error', error.message || 'No se pudo cargar el campesino');
        }
      };

      reload().catch(() => undefined);
      return () => undefined;
    }, [route.params.campesinoId, token]),
  );

  useEffect(() => {
    if (!token) return;

    Promise.all([listConsejos(token), listUsuarios(token)])
      .then(([consejosList, usersList]) => {
        setConsejos(Array.isArray(consejosList) ? consejosList.filter(Boolean) : []);
        setUsers(Array.isArray(usersList) ? usersList.filter(Boolean) : []);
      })
      .catch(() => {
        setConsejos([]);
        setUsers([]);
      });
  }, [token]);

  const consejoNameById = useMemo(
    () => new Map((Array.isArray(consejos) ? consejos : []).filter((item) => Boolean(item && item.id)).map((item) => [item.id, item.nombre] as const)),
    [consejos],
  );

  const userNameById = useMemo(
    () => new Map((Array.isArray(users) ? users : []).filter((item) => Boolean(item && item.id)).map((item) => [item.id, `${item.nombre} ${item.apellido}`] as const)),
    [users],
  );

  if (loading) {
    return (
      <View style={sharedScreenStyles.centered}>
        <Text style={sharedScreenStyles.helperText}>Cargando campesino...</Text>
      </View>
    );
  }

  if (!campesino) {
    return (
      <View style={sharedScreenStyles.centered}>
        <Text style={sharedScreenStyles.helperText}>No se encontró el campesino.</Text>
      </View>
    );
  }

  const isOfflineLocal = String(campesino.id).includes('temp') || String(campesino.cedula).includes('LOCAL-') || String(campesino.cedula).includes('Guardado localmente');

  const pendingAction = () => {

    navigation.navigate('FormulariosPendientes', { campesinoId: route.params.campesinoId });
  };

  const renderField = (label: string, value?: string | number | boolean | null) => (
    <View style={sharedScreenStyles.fieldRow}>
      <Text style={sharedScreenStyles.fieldLabel}>{label}</Text>
      <Text style={sharedScreenStyles.fieldValue}>{value != null && value !== '' ? String(value) : 'N/A'}</Text>
    </View>
  );

  return (
    <View style={sharedScreenStyles.surfaceWhite}>
      <Header
        title="Detalle de Campesino"
        subtitle={`${campesino.nombre} ${campesino.apellido ?? ''}`.trim()}
        leftIcon="arrow-left"
        onLeftPress={() => navigation.goBack()}
        showBorder
      />
      <ScrollView contentContainerStyle={sharedScreenStyles.contentLg}>
        <Card variant="elevated" padding="lg" style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {campesino.foto_url ? (
              <Image source={{ uri: campesino.foto_url }} style={styles.avatarImage} />
            ) : (
              <MaterialCommunityIcons name="account-group" size={72} color={Theme.colors.greenDark} />
            )}
          </View>

          <Text style={styles.nameText}>{campesino.nombre} {campesino.apellido || ''}</Text>
          {isOfflineLocal ? (
            <StatusPill label="Guardado localmente esperando sincronización" tone="warning" />
          ) : (
            <Text style={styles.subtitleText}>Cédula {campesino.cedula}</Text>
          )}
          <Text style={styles.subtitleText}>{campesino.consejo_nombre || (campesino.consejo_id ? consejoNameById.get(campesino.consejo_id) || `Consejo ${campesino.consejo_id}` : 'Consejo no asignado')}</Text>
        </Card>

        <Card variant="bordered" padding="lg" style={styles.detailsCard}>
          {renderField('Nombre', campesino.nombre)}
          {renderField('Apellido', campesino.apellido)}
          {renderField('Cédula', isOfflineLocal ? 'Guardado localmente esperando sincronización' : campesino.cedula)}

          {renderField('Teléfono', campesino.telefono)}
          {renderField('Correo', campesino.correo)}
          {renderField('Fecha de nacimiento', campesino.fecha_nacimiento ? String(campesino.fecha_nacimiento).slice(0, 10) : 'N/A')}
          {renderField('Género', campesino.genero)}
          {renderField('Dirección', campesino.direccion)}
          {renderField('Consejo', campesino.consejo_nombre || (campesino.consejo_id ? consejoNameById.get(campesino.consejo_id) || campesino.consejo_id : 'N/A'))}
          {renderField('Tiene pendientes', campesino.tiene_pendientes ? 'Sí' : 'No')}
        </Card>

        {campesino.tiene_pendientes ? (
          <Button
            label="Ver formularios pendientes"
            variant="primary"
            icon="clipboard-text"
            onPress={pendingAction}
            fullWidth
          />
        ) : null}

        {isAdminRole(user?.rol) ? (
          <Card variant="bordered" padding="lg" style={styles.adminCard}>
            <Text style={styles.adminTitle}>Información adicional</Text>
            {renderField('Creado por', campesino.creado_por ? (userNameById.get(campesino.creado_por) || (/^[0-9a-f-]{36}$/i.test(campesino.creado_por) ? 'N/A' : campesino.creado_por)) : 'N/A')}
            {renderField('Asignado a', campesino.asignado_a ? (userNameById.get(campesino.asignado_a) || (/^[0-9a-f-]{36}$/i.test(campesino.asignado_a) ? 'N/A' : campesino.asignado_a)) : 'N/A')}

            {renderField('Creado en', campesino.creado_en)}
            {renderField('Actualizado en', campesino.actualizado_en)}
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  profileCard: { alignItems: 'center' },
  avatarContainer: { marginBottom: Theme.spacing.md },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  nameText: { fontSize: Theme.fontSize['2xl'], fontWeight: Theme.fontWeight.bold, color: Theme.colors.darkGray, textAlign: 'center' },

  subtitleText: { color: Theme.colors.mediumGray, marginTop: Theme.spacing.xs, textAlign: 'center' },
  detailsCard: { gap: Theme.spacing.sm },
  adminCard: { borderColor: Theme.colors.lightGray, borderWidth: 1 },
  adminTitle: { fontSize: Theme.fontSize.base, fontWeight: Theme.fontWeight.bold, color: Theme.colors.darkGray, marginBottom: Theme.spacing.sm },
});

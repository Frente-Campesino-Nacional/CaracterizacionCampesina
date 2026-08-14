/**
 * Encuestador Profile Screen
 * Perfil de usuario encuestador
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert, TouchableOpacity, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Header, Card, Button } from '../../components';
import { Theme } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import { getUsuarioProfileImage, listCampesinos } from '../../services/adminService';
import { flushQueuedSubmissions, getFormulariosActivos, normalizeMetadata } from '../../services/encuestadorFormService';
import { flushQueuedCampesinoCreates } from '../../services/encuestadorCampesinoOfflineService';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export default function EncuestadorProfileScreen({ navigation }: any) {
  const { user, token, logout } = useAuthStore();
  const [photoSource, setPhotoSource] = useState<string | null>(null);
  const [stats, setStats] = useState({
    formularioCompletados: 0,
    formularioPendientes: 0,
    campesinesRegistrados: 0,
  });

  const loadStatistics = useCallback(async () => {
    if (!token || !user) return;

    await flushQueuedCampesinoCreates(token);
    await flushQueuedSubmissions(token);

    const [campesinos, formulariosActivos] = await Promise.all([
      listCampesinos(token),
      getFormulariosActivos(token),
    ]);

    const ownedCampesinos = campesinos.filter(
      (campesino) => campesino.asignado_a === user.id || campesino.creado_por === user.id,
    );
    const completedForms = ownedCampesinos.reduce((total, campesino) => {
      const metadata = normalizeMetadata(campesino.metadata ?? undefined);
      return total + metadata.formularios_respondidos.length;
    }, 0);

    const pendingForms = ownedCampesinos.reduce((total, campesino) => {
      const metadata = normalizeMetadata(campesino.metadata ?? undefined);
      const completedCount = metadata.formularios_respondidos.length;
      const missing = Math.max(formulariosActivos.length - completedCount, 0);
      return total + missing;
    }, 0);

    setStats({
      formularioCompletados: completedForms,
      formularioPendientes: pendingForms,
      campesinesRegistrados: ownedCampesinos.length,
    });
  }, [token, user]);

  useFocusEffect(
    useCallback(() => {
      loadStatistics().catch((error: any) => {
        Alert.alert('Error', error.message || 'No se pudieron cargar las estadísticas');
      });

      return () => undefined;
    }, [loadStatistics]),
  );

  useEffect(() => {
    if (!token || !user) return;

    getUsuarioProfileImage(token, user.id)
      .then((response) => {
        const image = response.imagen;
        if (image?.image_url) {
          setPhotoSource(image.image_url);
          return;
        }

        if (image?.image_base64 && image.content_type) {
          const source = `data:${image.content_type};base64,${image.image_base64}`;
          setPhotoSource(source);
          return;
        }

        setPhotoSource(null);
      })
      .catch(() => {
        setPhotoSource(null);
      });
  }, [token, user]);

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que deseas cerrar sesión?', [
      { text: 'Cancelar', onPress: () => {} },
      {
        text: 'Cerrar sesión',
        onPress: () => logout(),
        style: 'destructive',
      },
    ]);
  };

  const roleLabel = user?.rol
    ? user.rol.charAt(0).toUpperCase() + user.rol.slice(1)
    : 'Encuestador';

  return (
    <View style={styles.container}>
      <Header
        title="Mi Perfil"
        subtitle="Información personal"
        showBorder
      />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Encabezado del Perfil */}
        <Card variant="elevated" padding="lg" style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {photoSource ? (
              <Image source={{ uri: photoSource }} style={styles.avatarImage} />
            ) : (
              <MaterialCommunityIcons
                name="account-circle"
                size={80}
                color={Theme.colors.greenDark}
              />
            )}
          </View>
          <Text style={styles.userName}>{user?.nombre || 'Usuario'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'email@example.com'}</Text>
          <Text style={styles.userRole}>{roleLabel}</Text>
        </Card>

        {/* Estadísticas */}
        <Text style={styles.sectionTitle}>Estadísticas</Text>
        <View style={styles.statsGrid}>
          <Card variant="bordered" padding="md" style={styles.statCard}>
            <MaterialCommunityIcons
              name="file-check"
              size={32}
              color={Theme.colors.greenDark}
              style={{ marginBottom: Theme.spacing.md }}
            />
            <Text style={styles.statValue}>
              {stats.formularioCompletados}
            </Text>
            <Text style={styles.statLabel}>Completados</Text>
          </Card>

          <Card variant="bordered" padding="md" style={styles.statCard}>
            <MaterialCommunityIcons
              name="clipboard-check-outline"
              size={32}
              color={Theme.colors.warning}
              style={{ marginBottom: Theme.spacing.md }}
            />
            <Text style={styles.statValue}>
              {stats.formularioPendientes}
            </Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </Card>

          <Card variant="bordered" padding="md" style={styles.statCard}>
            <MaterialCommunityIcons
              name="account-group"
              size={32}
              color={Theme.colors.greenMedium}
              style={{ marginBottom: Theme.spacing.md }}
            />
            <Text style={styles.statValue}>
              {stats.campesinesRegistrados}
            </Text>
            <Text style={styles.statLabel}>Campesinos</Text>
          </Card>
        </View>

        {/* Información de Contacto */}
        <Text style={styles.sectionTitle}>Contacto</Text>
        <Card variant="elevated" padding="md">
          <View style={styles.contactRow}>
            <MaterialCommunityIcons
              name="email-outline"
              size={20}
              color={Theme.colors.greenDark}
              style={{ marginRight: Theme.spacing.md }}
            />
            <Text style={styles.contactText}>{user?.email || 'N/A'}</Text>
          </View>
          <View style={[styles.contactRow, { marginTop: Theme.spacing.md }]}>
            <MaterialCommunityIcons
              name="phone-outline"
              size={20}
              color={Theme.colors.greenDark}
              style={{ marginRight: Theme.spacing.md }}
            />
            <Text style={styles.contactText}>
              {user?.telefono || 'No registrado'}
            </Text>
          </View>
        </Card>

        {/* Acciones */}
        <View style={styles.actionsContainer}>
          <Button
            label="Historial de Cambios"
            variant="outline"
            icon="history"
            onPress={() => navigation.navigate('EncuestadorHistorial')}
            fullWidth
            style={{ marginTop: Theme.spacing.sm }}
          />
          <Button
            label="Cerrar Sesión"
            variant="danger"
            icon="logout"
            onPress={handleLogout}
            fullWidth
            style={{ marginTop: Theme.spacing.md }}
          />
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.white,
  },
  scrollContent: {
    padding: Theme.spacing.lg,
    gap: Theme.spacing.xl,
    paddingBottom: Theme.spacing.xxl,
  },
  profileHeader: {
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: Theme.spacing.lg,
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    backgroundColor: Theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: Theme.fontSize['2xl'],
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.darkGray,
    marginBottom: Theme.spacing.xs,
  },
  userEmail: {
    fontSize: Theme.fontSize.sm,
    color: Theme.colors.mediumGray,
    marginBottom: Theme.spacing.md,
  },
  userRole: {
    fontSize: Theme.fontSize.base,
    color: Theme.colors.greenDark,
    fontWeight: Theme.fontWeight.semibold,
    backgroundColor: Theme.colors.greenLightTransparent,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.darkGray,
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Theme.spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: Theme.fontSize['2xl'],
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.greenDark,
    marginBottom: Theme.spacing.xs,
  },
  statLabel: {
    fontSize: Theme.fontSize.xs,
    color: Theme.colors.mediumGray,
    fontWeight: Theme.fontWeight.medium,
    textAlign: 'center',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    fontSize: Theme.fontSize.base,
    color: Theme.colors.darkGray,
    flex: 1,
  },
  fieldLabel: {
    color: Theme.colors.mediumGray,
    fontSize: Theme.fontSize.sm,
    marginBottom: Theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Theme.colors.lightGray,
    borderRadius: Theme.borderRadius.lg,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    backgroundColor: Theme.colors.veryLightGray,
    marginBottom: Theme.spacing.md,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Theme.colors.greenDark,
    borderRadius: Theme.borderRadius.lg,
    paddingVertical: Theme.spacing.md,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: Theme.colors.mediumGray,
  },
  actionButtonText: {
    color: Theme.colors.white,
    fontWeight: Theme.fontWeight.bold,
  },
  actionsContainer: {
    marginTop: Theme.spacing.xl,
  },
});

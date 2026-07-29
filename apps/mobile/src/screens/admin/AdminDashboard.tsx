/**
 * Admin Dashboard Screen
 * Panel de control principal para administradores
 * Muestra estadísticas y acceso rápido a módulos
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card, Header } from '../../components';
import { Theme } from '../../theme/colors';
import { sharedScreenStyles } from '../../styles/sharedScreenStyles';
import { useAuthStore } from '../../store/authStore';
import { listCampesinos, listFormularios, listSyncRecords, listUsuarios, SyncRecord } from '../../services/adminService';

interface Stat {
  id: string;
  label: string;
  value: number;
  icon: string;
  color: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  onPress: () => void;
}

export default function AdminDashboard({ navigation }: any) {
  const { user, token } = useAuthStore();
  const [stats, setStats] = useState<Stat[]>([
    {
      id: '1',
      label: 'Usuarios Activos',
      value: 0,
      icon: 'account-multiple',
      color: Theme.colors.greenDark,
    },
    {
      id: '2',
      label: 'Campesinos',
      value: 0,
      icon: 'account-group',
      color: Theme.colors.greenMedium,
    },
    {
      id: '3',
      label: 'Formularios Activos',
      value: 0,
      icon: 'file-document-multiple',
      color: Theme.colors.info,
    },
    {
      id: '4',
      label: 'Eventos Hoy',
      value: 0,
      icon: 'check-circle',
      color: Theme.colors.success,
    },
  ]);

  const quickActions: QuickAction[] = [
    {
      id: '1',
      label: 'Usuarios',
      icon: 'account-multiple',
      onPress: () => navigation.navigate('AdminUsers'),
    },
    {
      id: '2',
      label: 'Campesinos',
      icon: 'account-group',
      onPress: () => navigation.navigate('AdminCampesinos'),
    },
    {
      id: '3',
      label: 'Formularios',
      icon: 'file-document-edit',
      onPress: () => navigation.navigate('AdminFormularios'),
    },
    {
      id: '4',
      label: 'Auditoría',
      icon: 'shield-check',
      onPress: () => navigation.navigate('AdminAuditoria'),
    },
  ];

  const [recentActivities, setRecentActivities] = useState<SyncRecord[]>([]);

  const getActivityIcon = (operation: string) => {
    if (operation.toLowerCase().includes('create')) return 'plus-circle-outline';
    if (operation.toLowerCase().includes('update')) return 'pencil-outline';
    if (operation.toLowerCase().includes('delete')) return 'trash-can-outline';
    if (operation.toLowerCase().includes('sync')) return 'sync-outline';
    return 'history';
  };

  const formatActivityTitle = (item: SyncRecord) => {
    const mensaje = String((item as any).mensaje || '').trim();
    if (mensaje) {
      return mensaje;
    }

    const capitalize = (s: string) => (s ? `${s.charAt(0).toUpperCase()}${s.slice(1)}` : s);
    const mapOperation = (op: string) => {
      const o = (op || '').toString().trim().toLowerCase();
      if (o.includes('create') || o.includes('insert') || o.includes('registro') || o.includes('registr')) return 'registrado';
      if (o.includes('update') || o.includes('edit') || o.includes('modif')) return 'actualizado';
      if (o.includes('delete') || o.includes('remove')) return 'eliminado';
      if (o.includes('sync') || o.includes('proces')) return 'sincronizado';
      return 'actualizado';
    };

    const entidadLower = (item.entidad || '').toLowerCase();
    const opLabel = mapOperation(item.operacion || item.estado);
    const getEntityLabel = () => {
      if (entidadLower === 'campesino') return 'Campesino';
      if (entidadLower === 'usuario') return 'Usuario';
      if (entidadLower === 'formulario') return 'Formulario';
      if (entidadLower === 'consejo') return 'Consejo';
      return capitalize(String(item.entidad || '')) || 'Registro';
    };
    const getDisplayName = () => {
      const datos = (item.datos || {}) as any;
      const directName = (item as any).target_nombre || datos.nombre || datos.nombre_completo || datos.nombre_persona || datos.titulo || datos.nombre_consejo || datos.nombre_usuario || datos.email;
      if (directName) return String(directName);

      const firstName = datos.nombre || datos.nombre_persona;
      const lastName = datos.apellido || datos.apellido_persona;
      if (firstName || lastName) {
        return [firstName, lastName].filter(Boolean).join(' ').trim();
      }

      return '';
    };
    const getActorName = () => {
      const datos = (item.datos || {}) as any;
      const actorName = (item as any).actor_nombre || datos.usuario_nombre || datos.admin_nombre || datos.usuario || datos.realizado_por || datos.creado_por || datos.nombre_admin;
      if (actorName && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(actorName))) {
        return String(actorName);
      }
      return '';
    };

    const entityLabel = getEntityLabel();
    const displayName = getDisplayName();
    const actorName = getActorName();

    if (['campesino', 'usuario', 'formulario', 'consejo'].includes(entidadLower)) {
      if (displayName && actorName) {
        return `${entityLabel} ${displayName} fue ${opLabel} por ${actorName}`;
      }
      if (displayName) {
        return `${entityLabel} ${displayName} fue ${opLabel}`;
      }
      if (actorName) {
        return `${entityLabel} fue ${opLabel} por ${actorName}`;
      }
      return `${entityLabel} fue ${opLabel}`;
    }

    return actorName ? `${entityLabel} fue ${opLabel} por ${actorName}` : `${entityLabel} fue ${opLabel}`;
  };

  const formatActivityTime = (createdAt: string) => {
    const date = new Date(createdAt);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStatCard = ({ item }: { item: Stat }) => (
    <Card variant="bordered" padding="md" style={styles.statCard}>
      <View style={styles.statHeader}>
        <MaterialCommunityIcons
          name={item.icon as any}
          size={28}
          color={item.color}
        />
      </View>
      <Text style={styles.statValue}>{item.value}</Text>
      <Text style={styles.statLabel}>{item.label}</Text>
    </Card>
  );

  const renderQuickAction = ({ item }: { item: QuickAction }) => (
    <TouchableOpacity
      onPress={item.onPress}
      activeOpacity={0.7}
      style={styles.quickActionItem}
    >
      <View style={styles.quickActionIconContainer}>
        <MaterialCommunityIcons
          name={item.icon as any}
          size={28}
          color={Theme.colors.greenDark}
        />
      </View>
      <Text style={styles.quickActionLabel}>{item.label}</Text>
    </TouchableOpacity>
  );

  const renderActivity = ({ item }: { item: SyncRecord }) => (
    <View style={styles.activityItem}>
      <View style={styles.activityIconContainer}>
        <MaterialCommunityIcons
          name={getActivityIcon(item.operacion) as any}
          size={20}
          color={Theme.colors.greenDark}
        />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{formatActivityTitle(item)}</Text>
        <Text style={styles.activityTime}>{formatActivityTime(item.creado_en)}</Text>
      </View>
    </View>
  );

  const loadData = useCallback(async () => {
    if (!token) return;

    try {
      const [usuarios, campesinos, formularios, syncRecords] = await Promise.all([
        listUsuarios(token),
        listCampesinos(token),
        listFormularios(token),
        listSyncRecords(token),
      ]);

      const today = new Date().toISOString().slice(0, 10);
      const eventsToday = syncRecords.filter((record) =>
        String(record.creado_en).startsWith(today),
      ).length;

      const recent = [...syncRecords]
        .sort((a, b) =>
          new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime(),
        )
        .slice(0, 4);

      setStats([
        {
          id: '1',
          label: 'Usuarios Activos',
          value: usuarios.length,
          icon: 'account-multiple',
          color: Theme.colors.greenDark,
        },
        {
          id: '2',
          label: 'Campesinos',
          value: campesinos.length,
          icon: 'account-group',
          color: Theme.colors.greenMedium,
        },
        {
          id: '3',
          label: 'Formularios Activos',
          value: formularios.filter((item) => item.activo).length,
          icon: 'file-document-multiple',
          color: Theme.colors.info,
        },
        {
          id: '4',
          label: 'Eventos Hoy',
          value: eventsToday,
          icon: 'check-circle',
          color: Theme.colors.success,
        },
      ]);

      setRecentActivities(recent);
    } catch {
      // Silently ignore; datos pueden cargarse parcialmente
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => undefined;
    }, [loadData]),
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <View style={sharedScreenStyles.surfaceWhite}>
      <Header
        title="Dashboard"
        subtitle={`Bienvenido, ${user?.nombre?.split(' ')[0]}`}
        showBorder
      />

      <ScrollView
        contentContainerStyle={sharedScreenStyles.contentLg}
        showsVerticalScrollIndicator={false}
      >
        {/* Bienvenida */}
        <Card variant="elevated" padding="lg" style={styles.welcomeCard}>
          <MaterialCommunityIcons
            name="leaf"
            size={32}
            color={Theme.colors.greenDark}
            style={{ marginBottom: Theme.spacing.md }}
          />
          <Text style={styles.welcomeTitle}>
            Bienvenido al Panel de Control
          </Text>
          <Text style={styles.welcomeSubtitle}>
            Aquí tienes un resumen de la actividad del sistema
          </Text>
        </Card>

        {/* Estadísticas */}
        <Text style={styles.sectionTitle}>Estadísticas</Text>
        <FlatList
          data={stats}
          renderItem={renderStatCard}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          numColumns={2}
          columnWrapperStyle={styles.statColumnWrapper}
        />

        {/* Acciones Rápidas */}
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <FlatList
          data={quickActions}
          renderItem={renderQuickAction}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          numColumns={2}
          columnWrapperStyle={styles.quickActionColumnWrapper}
        />

        {/* Actividad Reciente */}
        <Text style={styles.sectionTitle}>Actividad Reciente</Text>
        <Card variant="elevated" padding="md">
          <FlatList
            data={recentActivities}
            renderItem={renderActivity}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
            ItemSeparatorComponent={() => (
              <View style={styles.separator} />
            )}
          />
        </Card>

        {/* Espaciado inferior */}
        <View style={{ height: Theme.spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  welcomeCard: {
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.greenDark,
  },
  welcomeTitle: {
    fontSize: Theme.fontSize.xl,
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.darkGray,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: Theme.fontSize.sm,
    color: Theme.colors.mediumGray,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.darkGray,
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  statColumnWrapper: {
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.lg,
  },
  statHeader: {
    marginBottom: Theme.spacing.md,
  },
  statValue: {
    fontSize: Theme.fontSize['3xl'],
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
  quickActionColumnWrapper: {
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  quickActionItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.veryLightGray,
    borderWidth: 1,
    borderColor: Theme.colors.lightGray,
  },
  quickActionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.greenLight,
  },
  quickActionLabel: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.semibold,
    color: Theme.colors.darkGray,
    textAlign: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Theme.spacing.md,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.veryLightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.semibold,
    color: Theme.colors.darkGray,
    marginBottom: Theme.spacing.xs,
  },
  activityTime: {
    fontSize: Theme.fontSize.xs,
    color: Theme.colors.mediumGray,
    fontWeight: Theme.fontWeight.normal,
  },
  separator: {
    height: 1,
    backgroundColor: Theme.colors.lightGray,
    marginVertical: Theme.spacing.md,
  },
});
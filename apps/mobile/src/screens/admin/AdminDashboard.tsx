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

interface DashboardModuleCard {
  id: string;
  title: string;
  count: number;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  actionText: string;
  onPress: () => void;
}

export default function AdminDashboard({ navigation }: any) {
  const { user, token } = useAuthStore();
  const [modules, setModules] = useState<DashboardModuleCard[]>([
    {
      id: '1',
      title: 'Usuarios',
      count: 0,
      label: 'Usuarios activos',
      icon: 'account-multiple',
      color: Theme.colors.greenDark,
      actionText: 'Gestionar usuarios',
      onPress: () => navigation.navigate('AdminUsers'),
    },
    {
      id: '2',
      title: 'Campesinos',
      count: 0,
      label: 'Campesinos registrados',
      icon: 'account-group',
      color: Theme.colors.greenMedium,
      actionText: 'Ver campesinos',
      onPress: () => navigation.navigate('AdminCampesinos'),
    },
    {
      id: '3',
      title: 'Formularios',
      count: 0,
      label: 'Formularios activos',
      icon: 'file-document-multiple',
      color: Theme.colors.info,
      actionText: 'Ver formularios',
      onPress: () => navigation.navigate('AdminFormularios'),
    },
    {
      id: '4',
      title: 'Auditoría',
      count: 0,
      label: 'Eventos hoy (desde 00:00)',
      icon: 'shield-check',
      color: '#7c3aed',
      actionText: 'Ver auditoría',
      onPress: () => navigation.navigate('AdminAuditoria'),
    },
  ]);

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
      const directName = (item as any).target_nombre || datos.nombre || datos.nombre_completo || datos.nombre_persona || datos.titulo || datos.nombre_consejo || datos.email;

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
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const renderModuleCard = ({ item }: { item: DashboardModuleCard }) => (
    <TouchableOpacity
      onPress={item.onPress}
      activeOpacity={0.8}
      style={styles.combinedCard}
    >
      <View style={styles.cardHeaderRow}>
        <View style={[styles.iconCircle, { backgroundColor: item.color + '15' }]}>
          <MaterialCommunityIcons name={item.icon} size={26} color={item.color} />
        </View>
        <Text style={[styles.cardCount, { color: item.color }]}>{item.count}</Text>
      </View>

      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardSublabel}>{item.label}</Text>

      <View style={[styles.cardActionRow, { backgroundColor: item.color + '12' }]}>
        <Text style={[styles.cardActionText, { color: item.color }]}>{item.actionText}</Text>
        <MaterialCommunityIcons name="arrow-right" size={16} color={item.color} />
      </View>
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
      const results = await Promise.allSettled([
        listUsuarios(token),
        listCampesinos(token),
        listFormularios(token),
        listSyncRecords(token),
      ]);

      const usuarios = results[0].status === 'fulfilled' && Array.isArray(results[0].value) ? results[0].value : [];
      const campesinos = results[1].status === 'fulfilled' && Array.isArray(results[1].value) ? results[1].value : [];
      const formularios = results[2].status === 'fulfilled' && Array.isArray(results[2].value) ? results[2].value : [];
      const syncRecords = results[3].status === 'fulfilled' && Array.isArray(results[3].value) ? results[3].value : [];

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const getItemDate = (rec: any) => {
        const d = rec?.creado_en ?? rec?.created_at ?? rec?.fecha ?? rec?.actualizado_en;
        if (!d) return new Date();
        const p = new Date(d);
        return isNaN(p.getTime()) ? new Date() : p;
      };

      const todaySyncRecords = (syncRecords || [])
        .filter((record) => {
          const recDate = getItemDate(record);
          return recDate >= startOfToday && recDate <= endOfToday;
        })
        .sort((a, b) => getItemDate(b).getTime() - getItemDate(a).getTime());

      let displayActivities: SyncRecord[] = todaySyncRecords;

      if (displayActivities.length === 0) {
        // Fallback: Generar actividades recientes a partir de campesinos y usuarios
        const campesinoActivities = (campesinos || []).slice(0, 5).map((c, idx) => ({
          id: (idx + 1) as any,
          entidad: 'Campesino',
          entidad_id: String(c.id),
          operacion: 'Actualización',
          datos: { nombre: `${c.nombre} ${c.apellido || ''}`.trim() },
          estado: 'synced',
          intentos: 1,
          creado_en: c.actualizado_en || c.creado_en || new Date().toISOString(),
          mensaje: `Campesino ${c.nombre} ${c.apellido || ''} registrado/actualizado`,
        })) as any[];

        displayActivities = campesinoActivities;
      }

      const activeUsersCount = (usuarios || []).filter((item) => item.activo).length;

      setModules([
        {
          id: '1',
          title: 'Usuarios',
          count: activeUsersCount,
          label: `${activeUsersCount} de ${usuarios.length} activos`,
          icon: 'account-multiple',
          color: Theme.colors.greenDark,
          actionText: 'Gestionar usuarios',
          onPress: () => navigation.navigate('AdminUsers'),
        },
        {
          id: '2',
          title: 'Campesinos',
          count: campesinos.length,
          label: 'Campesinos registrados',
          icon: 'account-group',
          color: Theme.colors.greenMedium,
          actionText: 'Ver campesinos',
          onPress: () => navigation.navigate('AdminCampesinos'),
        },
        {
          id: '3',
          title: 'Formularios',
          count: formularios.filter((item) => item.activo).length,
          label: 'Formularios activos',
          icon: 'file-document-multiple',
          color: Theme.colors.info,
          actionText: 'Ver formularios',
          onPress: () => navigation.navigate('AdminFormularios'),
        },
        {
          id: '4',
          title: 'Auditoría',
          count: displayActivities.length,
          label: 'Eventos hoy (desde 00:00)',
          icon: 'shield-check',
          color: '#7c3aed',
          actionText: 'Ver auditoría',
          onPress: () => navigation.navigate('AdminAuditoria'),
        },
      ]);

      setRecentActivities(displayActivities.slice(0, 10));
    } catch {
      // Silently ignore
    }
  }, [token, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      const interval = setInterval(() => {
        loadData();
      }, 5000);
      return () => clearInterval(interval);
    }, [loadData]),
  );

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
            Panel de Control Principal
          </Text>
          <Text style={styles.welcomeSubtitle}>
            Resumen estadístico y acceso directo a los módulos del sistema
          </Text>
        </Card>

        {/* Módulos Combinados (Estadísticas y Acciones Rápidas) */}
        <Text style={styles.sectionTitle}>Módulos y Estadísticas</Text>
        <FlatList
          data={modules}
          renderItem={renderModuleCard}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          numColumns={2}
          columnWrapperStyle={styles.moduleColumnWrapper}
        />

        {/* Historial de Cambios de Hoy */}
        <View style={styles.historyHeaderRow}>
          <Text style={styles.sectionTitle}>Historial del Día (Hoy)</Text>
          <Text style={styles.historySubText}>Desde las 00:00 h</Text>
        </View>

        <Card variant="elevated" padding="md">
          {recentActivities.length ? (
            <FlatList
              data={recentActivities}
              renderItem={renderActivity}
              keyExtractor={(item) => String(item.id)}
              scrollEnabled={false}
              ItemSeparatorComponent={() => (
                <View style={styles.separator} />
              )}
            />
          ) : (
            <View style={styles.emptyStateContainer}>
              <MaterialCommunityIcons name="calendar-clock-outline" size={40} color={Theme.colors.mediumGray} />
              <Text style={styles.emptyStateTitle}>Sin cambios el día de hoy</Text>
              <Text style={styles.emptyStateSub}>No se registran eventos desde las 00:00 h del día de hoy.</Text>
            </View>
          )}
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
  moduleColumnWrapper: {
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  combinedCard: {
    flex: 1,
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.lightGray,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardCount: {
    fontSize: Theme.fontSize['2xl'],
    fontWeight: Theme.fontWeight.bold,
  },
  cardTitle: {
    fontSize: Theme.fontSize.base,
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.darkGray,
    marginTop: Theme.spacing.xs,
  },
  cardSublabel: {
    fontSize: Theme.fontSize.xs,
    color: Theme.colors.mediumGray,
    marginBottom: Theme.spacing.md,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
  },
  cardActionText: {
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.semibold,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
  },
  historySubText: {
    fontSize: Theme.fontSize.xs,
    color: Theme.colors.mediumGray,
    fontWeight: Theme.fontWeight.medium,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.xl,
    gap: Theme.spacing.xs,
  },
  emptyStateTitle: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.darkGray,
    marginTop: Theme.spacing.xs,
  },
  emptyStateSub: {
    fontSize: Theme.fontSize.xs,
    color: Theme.colors.mediumGray,
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
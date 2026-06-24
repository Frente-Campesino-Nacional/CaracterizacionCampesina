/**
 * Admin Users Screen
 * Gestión y visualización de usuarios
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Text } from 'react-native';
import { Header, Card, Button } from '../../components';
import { Theme } from '../../theme/colors';

interface User {
  id?: string;
  nombre?: string;
  email?: string;
  rol?: string;
}

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    // TODO: Cargar usuarios desde backend
    setUsers([]);
  }, []);

  const handleAddUser = () => {
    // TODO: Navegar a crear usuario
  };

  const renderUserItem = ({ item }: any) => (
    <Card variant="elevated" padding="md">
      <Text style={styles.userName}>{item.nombre || 'Usuario'}</Text>
      <Text style={styles.userEmail}>{item.email || 'email@example.com'}</Text>
      <Text style={styles.userRole}>{item.rol || 'Rol'}</Text>
      <View style={styles.buttonRow}>
        <Button
          label="Editar"
          size="sm"
          variant="outline"
          icon="pencil"
          onPress={() => {}}
          style={{ flex: 1 }}
        />
        <Button
          label="Eliminar"
          size="sm"
          variant="danger"
          icon="trash-can"
          onPress={() => {}}
          style={{ flex: 1, marginLeft: Theme.spacing.md }}
        />
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Header
        title="Usuarios"
        subtitle="Gestionar cuentas"
        rightIcon="plus-circle-outline"
        onRightPress={handleAddUser}
        showBorder
      />
      <FlatList
        data={users}
        contentContainerStyle={styles.listContent}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id ?? Math.random().toString()}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay usuarios registrados</Text>
            <Button
              label="Crear Usuario"
              variant="primary"
              onPress={handleAddUser}
              icon="plus"
              style={{ marginTop: Theme.spacing.lg }}
            />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.white,
  },
  listContent: {
    padding: Theme.spacing.lg,
    gap: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xxl,
  },
  userName: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.darkGray,
    marginBottom: Theme.spacing.xs,
  },
  userEmail: {
    fontSize: Theme.fontSize.sm,
    color: Theme.colors.mediumGray,
    marginBottom: Theme.spacing.xs,
  },
  userRole: {
    fontSize: Theme.fontSize.sm,
    color: Theme.colors.greenDark,
    fontWeight: Theme.fontWeight.semibold,
    marginBottom: Theme.spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Theme.spacing.xxl,
  },
  emptyText: {
    fontSize: Theme.fontSize.lg,
    color: Theme.colors.mediumGray,
    fontWeight: Theme.fontWeight.medium,
  },
});

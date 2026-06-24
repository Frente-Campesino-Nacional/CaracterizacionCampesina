/**
 * Header Component - Encabezado reutilizable para pantallas
 * Soporta título, subtítulo, acciones, y navegación
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Theme } from '../theme/colors';

interface HeaderProps {
  title: string;
  subtitle?: string;
  leftIcon?: string;
  rightIcon?: string;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  backgroundColor?: string;
  style?: ViewStyle;
  showBorder?: boolean;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    backgroundColor: Theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.lightGray,
  },
  headerWithBorder: {
    borderBottomWidth: 3,
    borderBottomColor: Theme.colors.greenDark,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: Theme.spacing.md,
  },
  title: {
    fontSize: Theme.fontSize['2xl'],
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.darkGray,
    marginBottom: Theme.spacing.xs,
  },
  subtitle: {
    fontSize: Theme.fontSize.sm,
    color: Theme.colors.mediumGray,
    fontWeight: Theme.fontWeight.normal,
  },
  iconButton: {
    padding: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
  },
  iconButtonActive: {
    backgroundColor: Theme.colors.veryLightGray,
  },
});

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
  backgroundColor,
  style,
  showBorder = false,
}) => {
  return (
    <View
      style={[
        styles.container,
        backgroundColor ? { backgroundColor } : undefined,
        showBorder ? styles.headerWithBorder : undefined,
        style,
      ]}
    >
      <View style={styles.contentContainer}>
        {leftIcon && (
          <TouchableOpacity
            style={[styles.iconButton, onLeftPress && styles.iconButtonActive]}
            onPress={onLeftPress}
            disabled={!onLeftPress}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={leftIcon as any}
              size={24}
              color={Theme.colors.greenDark}
            />
          </TouchableOpacity>
        )}

        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {rightIcon && (
          <TouchableOpacity
            style={[styles.iconButton, onRightPress && styles.iconButtonActive]}
            onPress={onRightPress}
            disabled={!onRightPress}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={rightIcon as any}
              size={24}
              color={Theme.colors.greenDark}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default Header;

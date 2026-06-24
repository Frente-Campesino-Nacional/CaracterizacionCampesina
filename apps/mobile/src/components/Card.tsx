/**
 * Card Component - Componente de tarjeta reutilizable
 * Contenedor flexible para mostrar contenido estructurado
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../theme/colors';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'bordered' | 'elevated';
  padding?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

const styles = StyleSheet.create({
  baseCard: {
    borderRadius: Theme.borderRadius.lg,
    overflow: 'hidden',
  },
  // Variantes
  defaultCard: {
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.lightGray,
  },
  borderedCard: {
    backgroundColor: Theme.colors.white,
    borderWidth: 2,
    borderColor: Theme.colors.greenLight,
  },
  elevatedCard: {
    backgroundColor: Theme.colors.white,
    ...Theme.shadows.md,
  },
  // Espaciado
  paddingSm: {
    padding: Theme.spacing.md,
  },
  paddingMd: {
    padding: Theme.spacing.lg,
  },
  paddingLg: {
    padding: Theme.spacing.xl,
  },
});

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  style,
}) => {
  const variantStyle = {
    default: styles.defaultCard,
    bordered: styles.borderedCard,
    elevated: styles.elevatedCard,
  }[variant];

  const paddingStyle = {
    sm: styles.paddingSm,
    md: styles.paddingMd,
    lg: styles.paddingLg,
  }[padding];

  return (
    <View style={[styles.baseCard, variantStyle, paddingStyle, style]}>
      {children}
    </View>
  );
};

export default Card;

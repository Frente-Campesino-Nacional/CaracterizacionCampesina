/**
 * Button Component - Componente de botón reutilizable
 * Soporta múltiples variantes: primary, secondary, outline, danger
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Theme } from '../theme/colors';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  // Tamaños
  smButton: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
  },
  mdButton: {
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.md,
  },
  lgButton: {
    paddingHorizontal: Theme.spacing.xxl,
    paddingVertical: Theme.spacing.lg,
  },
  fullWidth: {
    width: '100%',
  },
  // Variantes
  primaryButton: {
    backgroundColor: Theme.colors.greenDark,
  },
  secondaryButton: {
    backgroundColor: Theme.colors.greenLight,
  },
  outlineButton: {
    backgroundColor: Theme.colors.white,
    borderWidth: 2,
    borderColor: Theme.colors.greenDark,
  },
  dangerButton: {
    backgroundColor: Theme.colors.error,
  },
  disabledButton: {
    opacity: 0.5,
  },
  // Textos
  buttonText: {
    fontWeight: Theme.fontWeight.semibold,
    textAlign: 'center',
  },
  smText: {
    fontSize: Theme.fontSize.sm,
  },
  mdText: {
    fontSize: Theme.fontSize.base,
  },
  lgText: {
    fontSize: Theme.fontSize.lg,
  },
  primaryText: {
    color: Theme.colors.white,
  },
  secondaryText: {
    color: Theme.colors.darkGray,
  },
  outlineText: {
    color: Theme.colors.greenDark,
  },
  dangerText: {
    color: Theme.colors.white,
  },
});

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
}) => {
  const variantStyle = {
    primary: [styles.primaryButton, { backgroundColor: Theme.colors.greenDark }],
    secondary: [styles.secondaryButton, { backgroundColor: Theme.colors.greenLight }],
    outline: styles.outlineButton,
    danger: styles.dangerButton,
  }[variant];

  const textColorStyle = {
    primary: styles.primaryText,
    secondary: styles.secondaryText,
    outline: styles.outlineText,
    danger: styles.dangerText,
  }[variant];

  const sizeStyle = {
    sm: styles.smButton,
    md: styles.mdButton,
    lg: styles.lgButton,
  }[size];

  const textSizeStyle = {
    sm: styles.smText,
    md: styles.mdText,
    lg: styles.lgText,
  }[size];

  const iconSize = {
    sm: 16,
    md: 18,
    lg: 20,
  }[size];

  const iconColor = {
    primary: Theme.colors.white,
    secondary: Theme.colors.darkGray,
    outline: Theme.colors.greenDark,
    danger: Theme.colors.white,
  }[variant];

  return (
    <TouchableOpacity
      style={[
        styles.baseButton,
        sizeStyle,
        variantStyle,
        disabled && styles.disabledButton,
        fullWidth && styles.fullWidth,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading && <ActivityIndicator color={iconColor} size="small" />}
      {!loading && icon && iconPosition === 'left' && (
        <MaterialCommunityIcons name={icon as any} size={iconSize} color={iconColor} />
      )}
      <Text style={[styles.buttonText, textSizeStyle, textColorStyle]}>
        {label}
      </Text>
      {!loading && icon && iconPosition === 'right' && (
        <MaterialCommunityIcons name={icon as any} size={iconSize} color={iconColor} />
      )}
    </TouchableOpacity>
  );
};

export default Button;

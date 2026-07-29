/**
 * TextInput Component - Campo de entrada reutilizable
 * Soporte para label, placeholder, error, icon, validación
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Theme } from '../theme/colors';

interface CustomTextInputProps extends TextInputProps {
  label?: string;
  placeholder?: string;
  error?: string | undefined;
  icon?: string;
  rightIcon?: string;
  onRightIconPress?: (() => void) | undefined;
  disabled?: boolean;
  multiline?: boolean;
  containerStyle?: ViewStyle;
  isPassword?: boolean;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Theme.spacing.lg,
  },
  label: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.semibold,
    color: Theme.colors.darkGray,
    marginBottom: Theme.spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.lightGray,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.white,
    paddingHorizontal: Theme.spacing.md,
    height: 48,
  },
  inputContainerFocused: {
    borderColor: Theme.colors.greenDark,
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: Theme.colors.error,
  },
  inputContainerDisabled: {
    backgroundColor: Theme.colors.veryLightGray,
  },
  icon: {
    marginRight: Theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Theme.fontSize.base,
    color: Theme.colors.darkGray,
    fontWeight: Theme.fontWeight.normal,
    paddingVertical: Theme.spacing.sm,
  },
  inputMultiline: {
    height: 'auto',
    minHeight: 100,
    paddingVertical: Theme.spacing.md,
  },
  rightIconButton: {
    padding: Theme.spacing.sm,
    marginLeft: Theme.spacing.sm,
  },
  errorText: {
    fontSize: Theme.fontSize.xs,
    color: Theme.colors.error,
    marginTop: Theme.spacing.sm,
    fontWeight: Theme.fontWeight.medium,
  },
  helperText: {
    fontSize: Theme.fontSize.xs,
    color: Theme.colors.mediumGray,
    marginTop: Theme.spacing.xs,
    fontWeight: Theme.fontWeight.normal,
  },
});

export const TextInputField: React.FC<CustomTextInputProps> = ({
  label,
  placeholder,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  disabled = false,
  multiline = false,
  containerStyle,
  isPassword = false,
  value,
  onChangeText,
  onBlur,
  onFocus,
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!isPassword);

  const handleRightIconPress = () => {
    if (isPassword) {
      setShowPassword(!showPassword);
    } else if (onRightIconPress) {
      onRightIconPress();
    }
  };

  const rightIconName = isPassword
    ? showPassword
      ? 'eye-off-outline'
      : 'eye-outline'
    : rightIcon;

  const handleFocus = (event: any) => {
    setFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event: any) => {
    setFocused(false);
    onBlur?.(event);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputContainer,
          focused ? styles.inputContainerFocused : undefined,
          error ? styles.inputContainerError : undefined,
          disabled ? styles.inputContainerDisabled : undefined,
          multiline ? { height: 'auto', minHeight: 100 } : undefined,
        ]}
      >
        {icon && (
          <MaterialCommunityIcons
            name={icon as any}
            size={20}
            color={focused ? Theme.colors.greenDark : Theme.colors.mediumGray}
            style={styles.icon}
          />
        )}

        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          placeholder={placeholder}
          placeholderTextColor={Theme.colors.mediumGray}
          editable={!disabled}
          multiline={multiline}
          secureTextEntry={!showPassword && isPassword}
          value={value ?? ''}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCorrect={false}
          autoCapitalize={props.autoCapitalize ?? 'none'}
          importantForAutofill="yes"
          returnKeyType={props.returnKeyType ?? (isPassword ? 'done' : 'next')}
          {...props}
        />

        {rightIconName && (
          <TouchableOpacity
            style={styles.rightIconButton}
            onPress={handleRightIconPress}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={rightIconName as any}
              size={20}
              color={focused ? Theme.colors.greenDark : Theme.colors.mediumGray}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

export default TextInputField;

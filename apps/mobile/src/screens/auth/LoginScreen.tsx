/**
 * Login Screen - CensoCampesino
 * Pantalla de inicio de sesión con diseño moderno
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../../store/authStore';
import { login } from '../../services/authService';
import { Button, TextInputField, Card } from '../../components';
import { showErrorAlert } from '../../utils/humanizerUtils';
import { Theme } from '../../theme/colors';

import { sharedScreenStyles } from '../../styles/sharedScreenStyles';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<LoginForm>({ email: '', password: '' });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const { login: loginStore } = useAuthStore();

  const validateForm = (values: LoginForm) => {
    const nextErrors: { email?: string; password?: string } = {};

    if (!values.email.trim()) {
      nextErrors.email = 'Email requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      nextErrors.email = 'Email inválido';
    }

    if (!values.password.trim()) {
      nextErrors.password = 'Contraseña requerida';
    } else if (values.password.length < 8) {
      nextErrors.password = 'Mínimo 8 caracteres';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleFieldChange = (field: keyof LoginForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const onSubmit = async () => {
    if (!validateForm(form)) {
      return;
    }

    setLoading(true);
    try {
      const response = await login(form.email, form.password);
      loginStore(response.user, response.token);
    } catch (error: any) {
      showErrorAlert(error, 'El correo electrónico o la contraseña ingresados no son correctos.', 'Inicio de Sesión');
    } finally {
      setLoading(false);
    }

  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Encabezado */}
          <View style={styles.headerContainer}>
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons
                name="leaf"
                size={64}
                color={Theme.colors.greenDark}
              />
            </View>
            <Text style={styles.appTitle}>Censo Campesino</Text>
            <Text style={styles.appSubtitle}>
              Sistema de gestión de encuestas
            </Text>
          </View>

          {/* Card del Formulario */}
          <Card variant="elevated" padding="lg" style={styles.formCard}>
            <Text style={sharedScreenStyles.cardTitleLg}>Inicia sesión</Text>
            <Text style={styles.formSubtitle}>
              Ingresa tus credenciales para continuar
            </Text>

            {/* Email */}
            <TextInputField
              label="Correo Electrónico"
              placeholder="tu.email@ejemplo.com"
              icon="email-outline"
              value={form.email}
              onChangeText={(text) => handleFieldChange('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              error={errors.email}
              containerStyle={styles.fieldContainer}
            />

            {/* Password */}
            <TextInputField
              label="Contraseña"
              placeholder="••••••••"
              icon="lock-outline"
              value={form.password}
              onChangeText={(text) => handleFieldChange('password', text)}
              isPassword={true}
              autoComplete="password"
              textContentType="password"
              error={errors.password}
              containerStyle={styles.fieldContainer}
            />

            {/* Botón Login */}
            <Button
              label={loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              onPress={onSubmit}
              variant="primary"
              size="lg"
              icon="login"
              disabled={loading}
              loading={loading}
              fullWidth
              style={styles.loginButton}
            />
          </Card>

          {/* Footer */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              ¿Problemas para iniciar sesión?
            </Text>
            <Text style={styles.footerSubtext}>
              Contacta al administrador del sistema
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: sharedScreenStyles.surfaceWhite,
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.xl,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xxxl,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.veryLightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
    borderWidth: 2,
    borderColor: Theme.colors.greenLight,
  },
  appTitle: {
    fontSize: Theme.fontSize['4xl'],
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.darkGray,
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: Theme.fontSize.base,
    color: Theme.colors.mediumGray,
    fontWeight: Theme.fontWeight.normal,
    textAlign: 'center',
  },
  formCard: {
    marginBottom: Theme.spacing.xl,
  },
  formTitle: {
    fontSize: Theme.fontSize['2xl'],
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.darkGray,
    marginBottom: Theme.spacing.sm,
  },
  formSubtitle: {
    fontSize: Theme.fontSize.sm,
    color: Theme.colors.mediumGray,
    fontWeight: Theme.fontWeight.normal,
    marginBottom: Theme.spacing.xl,
  },
  fieldContainer: {
    marginBottom: Theme.spacing.lg,
  },
  loginButton: {
    marginTop: Theme.spacing.xl,
    marginBottom: Theme.spacing.lg,
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: Theme.spacing.xl,
    paddingVertical: Theme.spacing.lg,
  },
  footerText: {
    fontSize: Theme.fontSize.sm,
    color: Theme.colors.mediumGray,
    fontWeight: Theme.fontWeight.medium,
    marginBottom: Theme.spacing.xs,
  },
  footerSubtext: {
    fontSize: Theme.fontSize.xs,
    color: Theme.colors.mediumGray,
    fontWeight: Theme.fontWeight.normal,
  },
});
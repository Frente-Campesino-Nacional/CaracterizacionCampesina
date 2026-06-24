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
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../../store/authStore';
import { login } from '../../services/authService';
import { Button, TextInputField, Card } from '../../components';
import { Theme } from '../../theme/colors';

const schema = yup.object({
  email: yup.string().email('Email inválido').required('Email requerido'),
  password: yup
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .required('Contraseña requerida'),
});

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const { login: loginStore } = useAuthStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const response = await login(data.email, data.password);
      loginStore(response.user, response.token);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al iniciar sesión');
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
            <Text style={styles.formTitle}>Inicia sesión</Text>
            <Text style={styles.formSubtitle}>
              Ingresa tus credenciales para continuar
            </Text>

            {/* Email */}
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <TextInputField
                  label="Correo Electrónico"
                  placeholder="tu.email@ejemplo.com"
                  icon="email-outline"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email?.message ?? undefined}
                  containerStyle={styles.fieldContainer}
                />
              )}
            />

            {/* Password */}
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <TextInputField
                  label="Contraseña"
                  placeholder="••••••••"
                  icon="lock-outline"
                  value={value}
                  onChangeText={onChange}
                  isPassword={true}
                  error={errors.password?.message ?? undefined}
                  containerStyle={styles.fieldContainer}
                />
              )}
            />

            {/* Botón Login */}
            <Button
              label={loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              onPress={handleSubmit(onSubmit)}
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
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.white,
  },
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
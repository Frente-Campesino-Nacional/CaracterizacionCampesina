import React from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { deleteUsuarioProfileImage, getUsuarioProfileImage, saveUsuarioProfileImage, updateUsuario, UsuarioProfileImageRecord } from '../../services/adminService';
import { useAuthStore } from '../../store/authStore';
import { Theme } from '../../theme/colors';
import { sharedScreenStyles } from '../../styles/sharedScreenStyles';

const schema = yup.object({
  password: yup.string().min(8, 'Mínimo 8 caracteres').required('Contraseña requerida'),
});

interface ProfileScreenProps {
  title?: string;
}

export default function ProfileScreen({ title }: ProfileScreenProps) {
  const { user, token, logout } = useAuthStore();
  const navigation = useNavigation<any>();
  const [profilePhoto, setProfilePhoto] = React.useState<UsuarioProfileImageRecord | null>(null);
  const [photoUrl, setPhotoUrl] = React.useState('');
  const [photoBase64, setPhotoBase64] = React.useState('');
  const { watch, setValue, handleSubmit, formState: { errors } } = useForm<{ password: string }>({
    resolver: yupResolver(schema),
    defaultValues: { password: '' },
  });

  React.useEffect(() => {
    if (!token || !user) return;

    getUsuarioProfileImage(token, user.id)
      .then((response) => {
        setProfilePhoto(response);
        setPhotoUrl(response.imagen?.image_url || '');
        setPhotoBase64(response.imagen?.image_base64 || '');
      })
      .catch(() => {
        setProfilePhoto(null);
        setPhotoUrl('');
        setPhotoBase64('');
      });
  }, [token, user]);

  const currentPhotoSource = React.useMemo(() => {
    const image = profilePhoto?.imagen;
    if (!image) return null;

    if (image.image_url) {
      return { uri: image.image_url };
    }

    if (image.image_base64 && image.content_type) {
      return { uri: `data:${image.content_type};base64,${image.image_base64}` };
    }

    return null;
  }, [profilePhoto]);

  const onChangePassword = async ({ password }: { password: string }) => {
    if (!token || !user) return;
    try {
      await updateUsuario(token, user.id, { password });
      setValue('password', '');
      Alert.alert('Perfil', 'Contraseña actualizada correctamente');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo actualizar la contraseña');
    }
  };

  const onSavePhoto = async () => {
    if (!token || !user) return;

    const trimmedUrl = photoUrl.trim();
    const trimmedBase64 = photoBase64.trim();

    if (!trimmedUrl && !trimmedBase64) {
      Alert.alert('Validación', 'Ingresa una URL o un contenido base64 para la foto');
      return;
    }

    try {
      const response = await saveUsuarioProfileImage(token, user.id, {
        content_type: trimmedUrl ? 'image/*' : 'image/jpeg',
        image_url: trimmedUrl || undefined,
        image_base64: trimmedBase64 || undefined,
      });
      setProfilePhoto(response);
      Alert.alert('Perfil', 'Foto de perfil guardada correctamente');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar la foto de perfil');
    }
  };

  const onDeletePhoto = async () => {
    if (!token || !user) return;

    try {
      await deleteUsuarioProfileImage(token, user.id);
      setProfilePhoto(null);
      setPhotoUrl('');
      setPhotoBase64('');
      Alert.alert('Perfil', 'Foto de perfil eliminada');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo eliminar la foto de perfil');
    }
  };

  if (!user) {
    return (
      <View style={sharedScreenStyles.centered}>
        <Text>No hay sesión activa.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={sharedScreenStyles.surfaceWhite} contentContainerStyle={sharedScreenStyles.contentLg}>
      {navigation.canGoBack?.() ? (
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={Theme.colors.greenDark} />
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      ) : null}
      <View style={styles.headerCard}>
        <View style={styles.avatarCircle}>
          {currentPhotoSource ? (
            <Image source={currentPhotoSource} style={styles.avatarImage} />
          ) : (
            <MaterialCommunityIcons name="account-circle" size={72} color={Theme.colors.greenDark} />
          )}
        </View>
        <Text style={styles.userName}>{user.nombre} {user.apellido}</Text>
        <Text style={styles.userSubtitle}>{user.email}</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Foto de perfil</Text>
        <Text style={sharedScreenStyles.fieldLabel}>URL</Text>
        <TextInput
          value={photoUrl}
          onChangeText={setPhotoUrl}
          placeholder="https://..."
          autoCapitalize="none"
          style={styles.input}
        />
        <Text style={sharedScreenStyles.fieldLabel}>Base64 opcional</Text>
        <TextInput
          value={photoBase64}
          onChangeText={setPhotoBase64}
          placeholder="Contenido base64"
          autoCapitalize="none"
          style={[styles.input, styles.textArea]}
          multiline
        />
        <View style={styles.photoActionsRow}>
          <TouchableOpacity style={styles.primaryButton} onPress={onSavePhoto}>
            <Text style={styles.primaryButtonText}>Guardar foto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryButton, styles.deleteButton]} onPress={onDeletePhoto}>
            <Text style={styles.primaryButtonText}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>{title || 'Perfil'}</Text>
        <View style={styles.fieldRow}>
          <Text style={sharedScreenStyles.fieldLabel}>Nombre</Text>
          <Text style={sharedScreenStyles.fieldValue}>{user.nombre} {user.apellido}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={sharedScreenStyles.fieldLabel}>Email</Text>
          <Text style={sharedScreenStyles.fieldValue}>{user.email}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={sharedScreenStyles.fieldLabel}>Rol</Text>
          <Text style={sharedScreenStyles.fieldValue}>{user.rol}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Cambiar contraseña</Text>
        <Text style={sharedScreenStyles.fieldLabel}>Nueva contraseña</Text>
        <TextInput
          value={watch('password')}
          onChangeText={(value) => setValue('password', value)}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
          style={styles.input}
        />
        {!!errors.password?.message && <Text style={styles.error}>{errors.password.message}</Text>}
        <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit(onChangePassword)}>
          <Text style={styles.primaryButtonText}>Actualizar contraseña</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.primaryButton, styles.logoutButton]} onPress={logout}>
        <Text style={styles.primaryButtonText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: Theme.spacing.sm,
  },
  backButtonText: {
    color: Theme.colors.greenDark,
    fontWeight: Theme.fontWeight.semibold,
    fontSize: Theme.fontSize.base,
  },
  headerCard: {
    backgroundColor: Theme.colors.greenLightTransparent,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.lg,
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: Theme.fontSize['2xl'],
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.darkGray,
  },
  userSubtitle: {
    color: Theme.colors.mediumGray,
    marginTop: Theme.spacing.xs,
  },
  infoCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.lg,
    shadowColor: Theme.colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: Theme.colors.darkGray,
    marginBottom: Theme.spacing.md,
  },
  fieldRow: {
    marginBottom: Theme.spacing.md,
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
  error: {
    color: Theme.colors.error,
    marginBottom: Theme.spacing.sm,
  },
  primaryButton: {
    backgroundColor: Theme.colors.greenDark,
    borderRadius: Theme.borderRadius.lg,
    paddingVertical: Theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Theme.colors.white,
    fontWeight: Theme.fontWeight.bold,
  },
  logoutButton: {
    backgroundColor: Theme.colors.error,
  },
  deleteButton: {
    backgroundColor: Theme.colors.mediumGray,
  },
});

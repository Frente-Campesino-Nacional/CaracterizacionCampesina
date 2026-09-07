import React from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { deleteUsuarioProfileImage, getUsuarioProfileImage, saveUsuarioProfileImage, updateUsuario, UsuarioProfileImageRecord } from '../../services/adminService';
import { useAuthStore } from '../../store/authStore';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { showErrorAlert, showSuccessAlert } from '../../utils/humanizerUtils';
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
      showSuccessAlert('Perfil', 'Tu contraseña ha sido actualizada correctamente.');
    } catch (error: any) {
      showErrorAlert(error, 'No se pudo actualizar la contraseña');
    }
  };

  const processAndUploadPhoto = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!token || !user) return;
    let base64Data = asset.base64 || '';
    if (!base64Data && asset.uri) {
      try {
        base64Data = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } catch {
        // fallback
      }
    }

    if (!base64Data) {
      showErrorAlert('No se pudo procesar la imagen seleccionada.', 'Error de imagen');
      return;
    }

    try {
      const response = await saveUsuarioProfileImage(token, user.id, {
        content_type: asset.mimeType || 'image/jpeg',
        file_name: asset.fileName || 'foto-perfil.jpg',
        image_base64: base64Data,
      });
      setProfilePhoto(response);
      setPhotoBase64(response.imagen?.image_base64 || '');
      setPhotoUrl(response.imagen?.image_url || '');
      showSuccessAlert('Perfil', 'Tu foto de perfil ha sido actualizada exitosamente.');
    } catch (error: any) {
      showErrorAlert(error, 'No se pudo guardar la foto de perfil');
    }
  };

  const pickPhotoFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showErrorAlert('Se requieren permisos de galería para cambiar la foto de perfil.', 'Permiso denegado');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: false,
    });

    if (result.canceled || !result.assets.length) return;
    const asset = result.assets[0];
    if (asset) await processAndUploadPhoto(asset);
  };

  const takePhotoWithCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showErrorAlert('Se requieren permisos de cámara para tomar una foto con el dispositivo.', 'Permiso denegado');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: false,
    });

    if (result.canceled || !result.assets.length) return;
    const asset = result.assets[0];
    if (asset) await processAndUploadPhoto(asset);
  };


  const onSavePhoto = async () => {
    if (!token || !user) return;

    const trimmedUrl = photoUrl.trim();
    const trimmedBase64 = photoBase64.trim();

    if (!trimmedUrl && !trimmedBase64) {
      showErrorAlert('Por favor ingresa una URL o contenido base64 válido para la foto.', 'Campo requerido');
      return;
    }

    try {
      const response = await saveUsuarioProfileImage(token, user.id, {
        content_type: trimmedUrl ? 'image/*' : 'image/jpeg',
        image_url: trimmedUrl || undefined,
        image_base64: trimmedBase64 || undefined,
      });
      setProfilePhoto(response);
      showSuccessAlert('Perfil', 'Tu foto de perfil se guardó correctamente.');
    } catch (error: any) {
      showErrorAlert(error, 'No se pudo guardar la foto de perfil');
    }
  };

  const onDeletePhoto = async () => {
    if (!token || !user) return;

    try {
      await deleteUsuarioProfileImage(token, user.id);
      setProfilePhoto(null);
      setPhotoUrl('');
      setPhotoBase64('');
      showSuccessAlert('Perfil', 'Tu foto de perfil fue eliminada correctamente.');
    } catch (error: any) {
      showErrorAlert(error, 'No se pudo eliminar la foto de perfil');
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
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('MainTabs' as any);
          }
        }}
      >
        <MaterialCommunityIcons name="chevron-left" size={24} color={Theme.colors.greenDark} />
        <Text style={styles.backButtonText}>Volver</Text>
      </TouchableOpacity>
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
        <View style={{ flexDirection: 'row', gap: 10, marginTop: Theme.spacing.md }}>
          <TouchableOpacity style={[styles.primaryButton, { flex: 1, paddingVertical: 10 }]} onPress={takePhotoWithCamera}>
            <Text style={styles.primaryButtonText}>📷 Cámara</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryButton, { flex: 1, paddingVertical: 10, backgroundColor: Theme.colors.white, borderWidth: 1, borderColor: Theme.colors.greenDark }]} onPress={pickPhotoFromGallery}>
            <Text style={[styles.primaryButtonText, { color: Theme.colors.greenDark }]}>🖼️ Galería</Text>
          </TouchableOpacity>
          {profilePhoto ? (
            <TouchableOpacity style={[styles.primaryButton, styles.deleteButton, { paddingVertical: 10 }]} onPress={onDeletePhoto}>
              <Text style={styles.primaryButtonText}>🗑️</Text>
            </TouchableOpacity>
          ) : null}
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

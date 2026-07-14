import { SkeletonLoader } from '@/components/SkeletonLoader';
import { ThemePreference, useAppTheme } from '@/context/ThemeContext';
import { useAppColors } from '@/hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isAxiosError } from 'axios';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView, ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const ProfileScreen = () => {
  const { authState, updateUser } = useAuth();
  const { themePreference, setThemePreference } = useAppTheme();
  const user = authState.user;
  const colors = useAppColors();
  const { t, i18n } = useTranslation();

  const changeLanguage = async (lng: string) => {
    await AsyncStorage.setItem('@app_language', lng);
    i18n.changeLanguage(lng);
  };

  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  useEffect(() => {
    if (isEditing && user) {
      setNombre(user.nombre || '');
      setApellidoPaterno(user.apellido_paterno || '');
      setApellidoMaterno(user.apellido_materno || '');
    }
  }, [isEditing, user]);

  const handleSaveChanges = () => {
    Alert.alert(
      t('confirm_changes', 'Confirmar Cambios'),
      t('confirm_changes_msg', '¿Estás seguro de que quieres modificar tus datos?'),
      [
        { text: t('cancel', 'Cancelar'), style: "cancel" },
        { text: t('save', 'Guardar'), onPress: () => executeUpdate() }
      ]
    );
  };

  const executeUpdate = async () => {
    if (!nombre.trim()) {
      Toast.show({ type: 'error', text1: t('required_field', 'Campo requerido'), text2: t('name_empty', 'El nombre no puede estar vacío.'), visibilityTime: 4000 });
      return;
    }
    setIsLoading(true);
    try {
      const updatedData = {
        nombre: nombre.trim(),
        apellido_paterno: apellidoPaterno.trim(),
        apellido_materno: apellidoMaterno.trim(),
      };

      const response = await api.put('/api/profile', updatedData);

      if (response.data.success) {
        await updateUser(updatedData);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Toast.show({ type: 'success', text1: t('success', 'Éxito'), text2: t('profile_updated', 'Tu perfil ha sido actualizado.'), visibilityTime: 3000 });
        setIsEditing(false);
      } else {
        Toast.show({ type: 'error', text1: t('error', 'Error'), text2: response.data.message || t('error', 'Error'), visibilityTime: 4000 });
      }
    } catch (err) {
      console.error('Error al guardar el perfil:', err);
      if (isAxiosError(err) && err.response) {
        Toast.show({ type: 'error', text1: t('error', 'Error'), text2: err.response.data.message || t('error', 'Error'), visibilityTime: 4000 });
      } else {
        Toast.show({ type: 'error', text1: t('error_network', 'Error de Red'), text2: t('error_server', 'No se pudo conectar con el servidor.'), visibilityTime: 4000 });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setNombre(user?.nombre || '');
    setApellidoPaterno(user?.apellido_paterno || '');
    setApellidoMaterno(user?.apellido_materno || '');
    setIsEditing(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Toast.show({ type: 'error', text1: t('error', 'Error'), text2: t('fill_all_fields', 'Completa todos los campos.'), visibilityTime: 4000 });
      return;
    }
    if (newPassword.length < 6) {
      Toast.show({ type: 'error', text1: t('error', 'Error'), text2: t('password_min_length', 'La nueva contraseña debe tener al menos 6 caracteres.'), visibilityTime: 4000 });
      return;
    }
    if (newPassword !== confirmPassword) {
      Toast.show({ type: 'error', text1: t('error', 'Error'), text2: t('passwords_dont_match', 'Las contraseñas nuevas no coinciden.'), visibilityTime: 4000 });
      return;
    }
    if (currentPassword === newPassword) {
      Toast.show({ type: 'error', text1: t('error', 'Error'), text2: t('same_password', 'Esta es tu misma contraseña. Ingresa una diferente.'), visibilityTime: 4000 });
      return;
    }
    setIsLoading(true);
    try {
      const response = await api.post('/api/change-password', { currentPassword, newPassword });
      if (response.data.success) {
        Toast.show({ type: 'success', text1: t('success', 'Éxito'), text2: t('password_changed', 'Contraseña actualizada correctamente.'), visibilityTime: 3000 });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsChangingPassword(false);
      } else {
        Toast.show({ type: 'error', text1: t('error', 'Error'), text2: response.data.message || t('error_generic', 'Ocurrió un error inesperado.'), visibilityTime: 4000 });
      }
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.message) {
        Toast.show({ type: 'error', text1: t('error', 'Error'), text2: err.response.data.message, visibilityTime: 4000 });
      } else {
        Toast.show({ type: 'error', text1: t('error_network', 'Error de Red'), text2: t('error_server', 'No se pudo conectar con el servidor.'), visibilityTime: 4000 });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsChangingPassword(false);
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.containerCentered, { backgroundColor: colors.background }]}>
        <View style={{ width: '100%', alignItems: 'center', marginBottom: 30 }}>
          <SkeletonLoader circle width={100} style={{ marginBottom: 15 }} />
          <SkeletonLoader width={200} height={28} borderRadius={8} style={{ marginBottom: 8 }} />
          <SkeletonLoader width={150} height={16} borderRadius={4} />
        </View>
        <View style={{ width: '100%', paddingHorizontal: 20 }}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SkeletonLoader width="100%" height={50} borderRadius={8} style={{ marginBottom: 15 }} />
            <SkeletonLoader width="100%" height={50} borderRadius={8} style={{ marginBottom: 15 }} />
            <SkeletonLoader width="100%" height={50} borderRadius={8} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

      const isChanged = user && isEditing ? 
    (nombre.trim() !== (user.nombre || '')) ||
    (apellidoPaterno.trim() !== (user.apellido_paterno || '')) ||
    (apellidoMaterno.trim() !== (user.apellido_materno || ''))
    : false;

  const fullName = [user.nombre, user.apellido_paterno, user.apellido_materno].filter(Boolean).join(' ');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
              <Ionicons name="arrow-back" size={24} color={colors.headerText} />
            </TouchableOpacity>
          ),
        }}
      />
      
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isChangingPassword ? (
          // --- MODO CAMBIO DE CONTRASEÑA ---
          <View style={styles.formContainer}>
            <Text style={[styles.title, { color: colors.text }]}>{t('change_password', 'Cambiar Contraseña')}</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('current_password', 'Contraseña actual')}</Text>
            <View style={{ position: 'relative' }}>
              <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText, paddingRight: 50 }]} value={currentPassword} onChangeText={setCurrentPassword} placeholder="••••••" placeholderTextColor={colors.placeholder} secureTextEntry={!showCurrentPw} />
              <TouchableOpacity onPress={() => setShowCurrentPw(!showCurrentPw)} style={{ position: 'absolute', right: 15, top: 12 }}>
                <Ionicons name={showCurrentPw ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('new_password', 'Nueva contraseña')}</Text>
            <View style={{ position: 'relative' }}>
              <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText, paddingRight: 50 }]} value={newPassword} onChangeText={setNewPassword} placeholder={t('min_6_chars', 'Mínimo 6 caracteres')} placeholderTextColor={colors.placeholder} secureTextEntry={!showNewPw} />
              <TouchableOpacity onPress={() => setShowNewPw(!showNewPw)} style={{ position: 'absolute', right: 15, top: 12 }}>
                <Ionicons name={showNewPw ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('confirm_password', 'Confirmar nueva contraseña')}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="••••••" placeholderTextColor={colors.placeholder} secureTextEntry={!showNewPw} />
            {isLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <View style={styles.buttonGroup}>
                <TouchableOpacity style={[styles.cancelButton, { borderColor: colors.border }]} onPress={handleCancelPassword}>
                  <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>{t('cancel', 'Cancelar')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleChangePassword}>
                  <Text style={styles.saveButtonText}>{t('save', 'Guardar')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : isEditing ? (
          // --- MODO EDICIÓN ---
          <View style={styles.formContainer}>
            <Text style={[styles.title, { color: colors.text }]}>{t('edit_profile', 'Editar Perfil')}</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('first_name', 'Nombre')}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]} value={nombre} onChangeText={setNombre} placeholder={t('first_name', 'Tu nombre')} placeholderTextColor={colors.placeholder} autoCapitalize="words" />
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('last_name', 'Apellido Paterno')}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]} value={apellidoPaterno} onChangeText={setApellidoPaterno} placeholder={t('optional', '(Opcional)')} placeholderTextColor={colors.placeholder} autoCapitalize="words" />
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('last_name_2', 'Apellido Materno')}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]} value={apellidoMaterno} onChangeText={setApellidoMaterno} placeholder={t('optional', '(Opcional)')} placeholderTextColor={colors.placeholder} autoCapitalize="words" />
            {isLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <View style={styles.buttonGroup}>
                <TouchableOpacity style={[styles.cancelButton, { borderColor: colors.border }]} onPress={handleCancel}>
                  <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>{t('cancel', 'Cancelar')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary, opacity: !isChanged || isLoading ? 0.5 : 1 }]} onPress={handleSaveChanges} disabled={!isChanged || isLoading}>
                  <Text style={styles.saveButtonText}>{t('save', 'Guardar')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          // --- MODO VISUALIZACIÓN ---
          <View style={[styles.card, { backgroundColor: colors.profileCardBg }]}>
            <Ionicons name="person-circle-outline" size={100} color={colors.profileIconColor} style={{ marginBottom: 15 }} />
            <Text style={[styles.cardFullName, { color: colors.text }]}>{fullName || t('complete_profile', 'Completa tu perfil')}</Text>
            <Text style={[styles.cardEmail, { color: colors.textSecondary }]}>{user.correo_electronico}</Text>
            
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('appearance', 'Apariencia')}</Text>
            <View style={styles.themeToggleContainer}>
              {(['system', 'light', 'dark'] as ThemePreference[]).map((theme) => (
                <TouchableOpacity
                  key={theme}
                  style={[
                    styles.themeButton,
                    themePreference === theme ? { backgroundColor: colors.primary } : { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }
                  ]}
                  onPress={() => setThemePreference(theme)}
                >
                  <Ionicons 
                    name={theme === 'system' ? 'phone-portrait-outline' : theme === 'light' ? 'sunny-outline' : 'moon-outline'} 
                    size={16} 
                    color={themePreference === theme ? '#fff' : colors.textSecondary} 
                  />
                  <Text style={[
                    styles.themeButtonText, 
                    { color: themePreference === theme ? '#fff' : colors.textSecondary }
                  ]}>
                    {theme === 'system' ? t('system', 'Auto') : theme === 'light' ? t('light', 'Claro') : t('dark', 'Oscuro')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 10 }]} />

            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('language', 'Idioma')}</Text>
            <View style={styles.themeToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.themeButton,
                  i18n.language.startsWith('es') ? { backgroundColor: colors.primary } : { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }
                ]}
                onPress={() => changeLanguage('es')}
              >
                <Text style={{ fontSize: 16, marginRight: 5 }}>🇲🇽</Text>
                <Text style={[styles.themeButtonText, { color: i18n.language.startsWith('es') ? '#fff' : colors.textSecondary }]}>
                  {t('spanish', 'Español')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.themeButton,
                  i18n.language.startsWith('en') ? { backgroundColor: colors.primary } : { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }
                ]}
                onPress={() => changeLanguage('en')}
              >
                <Text style={{ fontSize: 16, marginRight: 5 }}>🇺🇸</Text>
                <Text style={[styles.themeButtonText, { color: i18n.language.startsWith('en') ? '#fff' : colors.textSecondary }]}>
                  {t('english', 'Inglés')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={[styles.editButton, { backgroundColor: colors.primary }]} onPress={() => setIsEditing(true)}>
              <Ionicons name="pencil" size={18} color="#fff" />
              <Text style={styles.editButtonText}>{t('edit_profile', 'Editar Perfil')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.editButton, { backgroundColor: colors.textSecondary, marginTop: 10 }]} onPress={() => setIsChangingPassword(true)}>
              <Ionicons name="lock-closed-outline" size={18} color="#fff" />
              <Text style={styles.editButtonText}>{t('change_password', 'Cambiar Contraseña')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerCentered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  
  // Estilos de la Tarjeta de Visualización
  card: {
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    width: '100%',
  },
  cardFullName: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  cardEmail: { fontSize: 16, marginTop: 5, marginBottom: 10 },
  divider: { width: '100%', height: 1, marginVertical: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, alignSelf: 'flex-start' },
  themeToggleContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 10 },
  themeButton: { flex: 1, paddingVertical: 10, marginHorizontal: 4, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  themeButtonText: { fontSize: 13, fontWeight: '600' },
  editButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: 'center',
  },
  editButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  // Estilos del Formulario de Edición
  formContainer: { width: '100%' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 25, textAlign: 'center' },
  label: { fontSize: 16, marginBottom: 8, alignSelf: 'flex-start' },
  input: { width: '100%', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 8, fontSize: 16, marginBottom: 20, borderWidth: 1 },
  buttonGroup: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 12 },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
  saveButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default ProfileScreen;

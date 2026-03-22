import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Button, Alert, ActivityIndicator,
  SafeAreaView, ScrollView, TouchableOpacity
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { isAxiosError } from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useAppColors } from '@/hooks/useAppColors';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { useAppTheme, ThemePreference } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [nombre, setNombre] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
      Alert.alert(t('required_field', 'Campo requerido'), t('name_empty', 'El nombre no puede estar vacío.'));
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
        Alert.alert(t('success', 'Éxito'), t('profile_updated', 'Tu perfil ha sido actualizado.'));
        setIsEditing(false);
      } else {
        Alert.alert(t('error', 'Error'), response.data.message || t('error', 'Error'));
      }
    } catch (err) {
      console.error('Error al guardar el perfil:', err);
      if (isAxiosError(err) && err.response) {
        Alert.alert(t('error', 'Error'), err.response.data.message || t('error', 'Error'));
      } else {
        Alert.alert(t('error_network', 'Error de Red'), t('error_server', 'No se pudo conectar con el servidor.'));
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
        {isEditing ? (
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

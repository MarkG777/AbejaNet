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

const ProfileScreen = () => {
  const { authState, updateUser } = useAuth();
  const user = authState.user;

  const [isEditing, setIsEditing] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    // Al entrar en modo edición, carga los datos actuales del usuario en el formulario.
    // Esto asegura que el formulario siempre empiece con la información más reciente.
    if (isEditing && user) {
      setNombre(user.nombre || '');
      setApellidoPaterno(user.apellido_paterno || '');
      setApellidoMaterno(user.apellido_materno || '');
    }
  }, [isEditing, user]);

  const handleSaveChanges = () => {
    Alert.alert(
      "Confirmar Cambios",
      "¿Estás seguro de que quieres modificar tus datos?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Confirmar", onPress: () => executeUpdate() }
      ]
    );
  };

  const executeUpdate = async () => {
    if (!nombre.trim()) {
      Alert.alert('Campo requerido', 'El nombre no puede estar vacío.');
      return;
    }
    setIsLoading(true);
    try {
      const updatedData = {
        nombre: nombre.trim(),
        apellido_paterno: apellidoPaterno.trim(),
        apellido_materno: apellidoMaterno.trim(),
      };

      // Usamos nuestro cliente 'api' centralizado que ya incluye el token
      const response = await api.put('/api/profile', updatedData);

      if (response.data.success) {
        // Actualizamos el estado local en AuthContext para reflejar los cambios
        await updateUser(updatedData);
        Alert.alert('Éxito', 'Tu perfil ha sido actualizado.');
        setIsEditing(false);
      } else {
        Alert.alert('Error', response.data.message || 'No se pudo actualizar el perfil.');
      }
    } catch (err) {
      console.error('Error al guardar el perfil:', err);
      // El interceptor se encarga del logout en caso de 401/403.
      // Aquí solo mostramos un mensaje amigable al usuario.
      if (isAxiosError(err) && err.response) {
        Alert.alert('Error', err.response.data.message || 'No se pudo actualizar el perfil.');
      } else {
        Alert.alert('Error de Red', 'No se pudo conectar con el servidor.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Restaura los valores originales y sale del modo de edición
    setNombre(user?.nombre || '');
    setApellidoPaterno(user?.apellido_paterno || '');
    setApellidoMaterno(user?.apellido_materno || '');
    setIsEditing(false);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.containerCentered}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={{ marginTop: 10 }}>Cargando perfil...</Text>
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
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />
      
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isEditing ? (
          // --- MODO EDICIÓN ---
          <View style={styles.formContainer}>
            <Text style={styles.title}>Editar Perfil</Text>
            <Text style={styles.label}>Nombre</Text>
            <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Tu nombre" autoCapitalize="words" />
            <Text style={styles.label}>Apellido Paterno</Text>
            <TextInput style={styles.input} value={apellidoPaterno} onChangeText={setApellidoPaterno} placeholder="(Opcional)" autoCapitalize="words" />
            <Text style={styles.label}>Apellido Materno</Text>
            <TextInput style={styles.input} value={apellidoMaterno} onChangeText={setApellidoMaterno} placeholder="(Opcional)" autoCapitalize="words" />
            {isLoading ? (
              <ActivityIndicator size="large" color="#3498db" style={{ marginVertical: 20 }} />
            ) : (
              <View style={styles.buttonGroup}>
                <Button title="Cancelar" onPress={handleCancel} color="#888" />
                <Button title="Guardar Cambios" onPress={handleSaveChanges} color="#3498db" disabled={!isChanged || isLoading} />
              </View>
            )}
          </View>
        ) : (
          // --- MODO VISUALIZACIÓN ---
          <View style={styles.card}>
            <Ionicons name="person-circle-outline" size={100} color="#3498db" style={{ marginBottom: 15 }} />
            <Text style={styles.cardFullName}>{fullName || 'Completa tu perfil'}</Text>
            <Text style={styles.cardEmail}>{user.correo_electronico}</Text>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
              <Ionicons name="pencil" size={18} color="#fff" />
              <Text style={styles.editButtonText}>Editar Perfil</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f7' },
  containerCentered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f7' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  
  // Estilos de la Tarjeta de Visualización
  card: {
    backgroundColor: '#ffffff',
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
  cardFullName: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  cardEmail: { fontSize: 16, color: '#666', marginTop: 5, marginBottom: 20 },
  divider: { width: '100%', height: 1, backgroundColor: '#eee', marginVertical: 20 },
  editButton: {
    flexDirection: 'row',
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: 'center',
  },
  editButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  // Estilos del Formulario de Edición
  formContainer: { width: '100%' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 25, textAlign: 'center', color: '#333' },
  label: { fontSize: 16, color: '#555', marginBottom: 8, alignSelf: 'flex-start' },
  input: { width: '100%', backgroundColor: 'white', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 8, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: '#ddd' },
  buttonGroup: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
});

export default ProfileScreen;

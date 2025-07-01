import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Button,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getApiUrl } from '../../utils/ip_config';

const ProfileScreen = () => {
  const { authState, updateUser } = useAuth();
  const user = authState.user;

  const [nombre, setNombre] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setNombre(user.nombre || '');
      setApellidoPaterno(user.apellido_paterno || '');
      setApellidoMaterno(user.apellido_materno || '');
    }
  }, [user]);

  const handleSaveChanges = async () => {
    if (!nombre.trim()) {
      Alert.alert('Campo requerido', 'El nombre no puede estar vacío.');
      return;
    }

    setIsLoading(true);
    try {
      const apiUrl = await getApiUrl();
      const response = await fetch(`${apiUrl}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.accessToken}`,
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          apellido_paterno: apellidoPaterno.trim(),
          apellido_materno: apellidoMaterno.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await updateUser({
          nombre: nombre.trim(),
          apellido_paterno: apellidoPaterno.trim(),
          apellido_materno: apellidoMaterno.trim(),
        });
        Alert.alert('Éxito', 'Tu perfil ha sido actualizado.');
      } else {
        Alert.alert('Error', data.message || 'No se pudo actualizar el perfil.');
      }
    } catch (error) {
      console.error('Error al guardar el perfil:', error);
      Alert.alert('Error de Red', 'No se pudo conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.containerCentered}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={{ marginTop: 10 }}>Cargando perfil...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.card}>
        <Text style={styles.title}>Editar Perfil</Text>

        <Text style={styles.label}>Correo Electrónico</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={user.correo_electronico}
          editable={false}
        />

        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          value={nombre}
          onChangeText={setNombre}
          placeholder="Tu nombre"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Apellido Paterno</Text>
        <TextInput
          style={styles.input}
          value={apellidoPaterno}
          onChangeText={setApellidoPaterno}
          placeholder="(Opcional)"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Apellido Materno</Text>
        <TextInput
          style={styles.input}
          value={apellidoMaterno}
          onChangeText={setApellidoMaterno}
          placeholder="(Opcional)"
          autoCapitalize="words"
        />

        {isLoading ? (
          <ActivityIndicator size="large" color="#3498db" style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.buttonContainer}>
            <Button title="Guardar Cambios" onPress={handleSaveChanges} color="#3498db" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f7',
  },
  containerCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f7',
  },
  card: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 25,
    textAlign: 'center',
    color: '#333',
  },
  label: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  input: {
    width: '100%',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inputDisabled: {
    backgroundColor: '#e9ecef',
    color: '#6c757d',
  },
  buttonContainer: {
    marginTop: 10,
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
});

export default ProfileScreen;

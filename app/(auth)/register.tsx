import { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { getApiUrl } from '../../utils/ip_config';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [api, setApi] = useState('');

  useEffect(() => {
    const fetchApiUrl = async () => {
      const apiUrl = await getApiUrl();
      setApi(apiUrl);
    };
    fetchApiUrl();
  }, []);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Todos los campos son obligatorios.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }
    if (!api) {
        Alert.alert('Error', 'No se pudo obtener la URL del servidor. Inténtalo de nuevo.');
        return;
    }

    try {
      const response = await fetch(`${api}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correo_electronico: email,
          contrasena: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Registro Exitoso',
          'Tu cuenta ha sido creada. Ahora puedes iniciar sesión.',
          [{ text: 'OK', onPress: () => router.push('/login') }]
        );
      } else {
        Alert.alert('Error de Registro', data.message || 'No se pudo completar el registro.');
      }
    } catch (error) {
      console.error('Error de red al registrar:', error);
      Alert.alert('Error de Conexión', 'No se pudo conectar con el servidor. Verifica tu conexión a internet.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={{ alignItems: 'center' }}>
        <Image
          source={require('@/assets/images/abejanet.png')}
          style={styles.logo}
        />
      </ThemedView>
      <ThemedText type="title">Crea tu cuenta</ThemedText>
      <TextInput
        placeholder="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />
      <TextInput
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <TextInput
        placeholder="Confirmar Contraseña"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        style={styles.input}
      />
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <ThemedText type="defaultSemiBold" style={styles.buttonText}>Crear cuenta</ThemedText>
      </TouchableOpacity>
      <Link href="/login" style={styles.link}>
        <ThemedText type="link">¿Ya tienes una cuenta? Inicia sesión</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 15,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  logo: {
    width: 180,
    height: 180,
    borderRadius: 90,
    marginBottom: 20,
    borderWidth: 4,
    borderColor: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
      marginTop: 15,
      textAlign: 'center',
  }
});

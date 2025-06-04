import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { useAuth } from '../../context/AuthContext'; // Import useAuth
import { getApiUrl } from '../../utils/ip_config';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth(); // Get login function from AuthContext

  const handleLogin = async () => {
    console.log('LoginScreen: handleLogin triggered'); // <-- NUEVO LOG AQUÍ
    if (!email || !password) {
      Alert.alert('Completa los campos');
      return;
    }

    try {
      const api = await getApiUrl();
      console.log('LoginScreen: getApiUrl() resolved, API_BASE_URL =', api); // <-- LOG MODIFICADO/AÑADIDO
      console.log('API_BASE_URL =', api); // Mantengo tu log original por si acaso
      console.log('LoginScreen: Preparing to fetch...'); // <-- NUEVO LOG
      const res = await fetch(`${api}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      console.log('LoginScreen: Fetch call completed. Response status:', res.status); // <-- NUEVO LOG

      const data = await res.json();
      console.log('LoginScreen: Response data parsed:', data); // <-- NUEVO LOG

      if (res.ok && data.success && data.token && data.user && data.user.rol) {
        console.log('LoginScreen: Login successful, calling authContext.login with token and role.'); // <-- NUEVO LOG
        // Call the login function from AuthContext
        // This will update the global auth state and trigger redirection in _layout.tsx
        await login(data.token, data.user.rol);
        // No need for router.push here anymore, _layout.tsx handles it.
      } else if (res.ok && data.success && (!data.token || !data.user || !data.user.rol)){
        console.error('LoginScreen: Login successful but token/role missing. Data:', data); // <-- NUEVO LOG
        Alert.alert('Error de Inicio de Sesión', 'Respuesta inesperada del servidor. Falta token o rol.');
      } else {
        console.log('LoginScreen: Login failed or other server error. Data:', data); // <-- NUEVO LOG
        Alert.alert('Error', data.message || 'Credenciales inválidas');
      }
    } catch (err: any) {
      console.error('LoginScreen: Caught error in handleLogin fetch process:', err); // <-- LOG MEJORADO
      if (err instanceof Error) {
        console.error('LoginScreen: Error name:', err.name, 'Error message:', err.message);
      }
      console.log('Login fetch error', err); // Tu log original, por si acaso.
      Alert.alert('Error de red', (err?.message as string) || 'No se pudo contactar al servidor');
    }
  };

  const gotoRegister = () => {
    // Navigate to the register screen within the (auth) group
    router.push('/(auth)/register');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <ThemedView style={{ alignItems: 'center' }}>
          <Image
            source={require('@/assets/images/abejanet.png')}
            style={styles.logo}
          />
        </ThemedView>
        <ThemedText type="title">Iniciar Sesión</ThemedText>
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
        <Pressable style={styles.button} onPress={handleLogin}>
          <ThemedText type="defaultSemiBold" style={styles.buttonText}>Ingresar</ThemedText>
        </Pressable>
        <Pressable onPress={gotoRegister} style={styles.registerLink}>
          <Text style={styles.registerText}>
            ¿No tienes cuenta? <Text style={styles.link}>Regístrate</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  logo: {
    width: 240,
    height: 240,
    borderRadius: 120,
    marginBottom: 24,
    borderWidth: 4,
    borderColor: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  registerLink: {
    marginTop: 12,
    alignSelf: 'center',
  },
  registerText: {
    color: '#555',
  },
  link: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
});

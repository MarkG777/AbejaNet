import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext'; // Import useAuth
import { getApiUrl } from '../../utils/ip_config';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { login } = useAuth(); // Get login function from AuthContext

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Completa los campos');
      return;
    }

    try {
      const api = await getApiUrl();
      const res = await fetch(`${api}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.token && data.user && data.user.rol) {
        await login(data.token, data.user.rol);
      } else if (res.ok && data.success && (!data.token || !data.user || !data.user.rol)){
        Alert.alert('Error de Inicio de Sesión', 'Respuesta inesperada del servidor. Falta token o rol.');
      } else {
        Alert.alert('Error', data.message || 'Credenciales inválidas');
      }
    } catch (err: any) {
      Alert.alert('Error de red', (err?.message as string) || 'No se pudo contactar al servidor');
    }
  };

  const gotoRegister = () => {
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
        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!isPasswordVisible}
            style={styles.passwordInput}
          />
          <TouchableOpacity
            onPressIn={() => setIsPasswordVisible(true)}
            onPressOut={() => setIsPasswordVisible(false)}
            style={styles.eyeIconContainer}
          >
            <Ionicons name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} size={24} color="#888" />
          </TouchableOpacity>
        </View>
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
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeIconContainer: {
    padding: 12,
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

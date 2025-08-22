import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
} from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useAuth } from '../../context/AuthContext';
import Constants from 'expo-constants';
import { getApiUrl } from '../../utils/ip_config';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function LoginScreen() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  useEffect(() => {
    try {
      const googleAuthConfig = Constants.expoConfig?.extra?.googleAuth;
      if (!googleAuthConfig) {
        throw new Error('La configuración de Google Auth no se encuentra en app.json.');
      }

      // Determina qué Android Client ID usar
      const androidClientId = __DEV__ 
        ? googleAuthConfig.androidClientIdDebug 
        : googleAuthConfig.androidClientId;

      if (!androidClientId) {
        throw new Error(`El Client ID de Android para el entorno ${__DEV__ ? 'de depuración' : 'de producción'} no está definido.`);
      }

      GoogleSignin.configure({
        webClientId: googleAuthConfig.webClientId, // Necesario para obtener el idToken
        androidClientId: androidClientId,         // ID específico para la app Android
        iosClientId: googleAuthConfig.iosClientId,   // ID específico para iOS
      });

      console.log(`Google Sign-In configurado para el entorno ${__DEV__ ? 'DEBUG' : 'PROD'}.`);

    } catch (error: any) {
      console.error('Error al configurar Google Sign-In:', error.message);
      Alert.alert('Error de Configuración', error.message || 'No se pudo inicializar Google Sign-In.');
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.idToken;
      
      if (idToken) {
        const api = await getApiUrl();
        const res = await fetch(`${api}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: idToken }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          await login(data.token, data.user.rol, data.user);
        } else {
          Alert.alert('Error de autenticación', data.message || 'No se pudo iniciar sesión con Google.');
        }
      } else {
        throw new Error('No se pudo obtener el idToken de Google.');
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // no hacer nada si el usuario cancela
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // no hacer nada, ya está en progreso
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Los servicios de Google Play no están disponibles.');
      } else {
        Alert.alert('Error de inicio de sesión', 'Ocurrió un error inesperado.');
        console.error('Error en handleGoogleSignIn:', error);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const api = await getApiUrl();
      const res = await fetch(`${api}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await login(data.token, data.user.rol, data.user);
      } else {
        Alert.alert('Error de autenticación', data.message || 'Credenciales incorrectas');
      }
    } catch (err: any) {
      Alert.alert('Error de red', err.message || 'No se pudo contactar al servidor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.titleContainer}>
          <Image source={require('../../assets/images/abejanet.png')} style={styles.logo} />
          <ThemedText type="title">Bienvenido a AbejaNet</ThemedText>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Correo Electrónico"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!isPasswordVisible}
            />
            <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeIcon}>
              <Ionicons name={isPasswordVisible ? 'eye-off' : 'eye'} size={24} color="gray" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading || isGoogleLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>

          <View style={styles.separatorContainer}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>o</Text>
            <View style={styles.separatorLine} />
          </View>

          <TouchableOpacity style={[styles.button, styles.googleButton]} onPress={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
            {isGoogleLoading ? (
                <ActivityIndicator color="#333" />
            ) : (
              <>
                <Image source={require('../../assets/images/google-logo.jpg')} style={styles.googleIcon} />
                <Text style={[styles.buttonText, styles.googleButtonText]}>Continuar con Google</Text>
              </>
            )}
          </TouchableOpacity>

          <Pressable onPress={() => router.push('/(auth)/register')} disabled={isLoading || isGoogleLoading}>
            <ThemedText type="link" style={styles.linkText}>
              ¿No tienes una cuenta? <Text style={styles.boldLink}>Regístrate aquí</Text>
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => router.push('/(auth)/forgot-password' as any)} disabled={isLoading || isGoogleLoading}>
            <ThemedText type="link" style={styles.linkText}>¿Olvidaste tu contraseña?</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: 'transparent',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60, // make it circular
    overflow: 'hidden',
    resizeMode: 'cover',
    marginBottom: 20,
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    height: 50,
    borderColor: '#CCC',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#FFF',
  },
  input: {
    flex: 1,
    height: '100%',
  },
  eyeIcon: {
    padding: 5,
  },
  button: {
    width: '90%',
    padding: 15,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    height: 50,
    minHeight: 50, // Ensure button has a minimum height
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    borderColor: '#DDD',
    borderWidth: 1,
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  googleButtonText: {
    color: '#333',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    marginVertical: 20,
    backgroundColor: 'transparent',
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#CCC',
  },
  separatorText: {
    marginHorizontal: 10,
    color: '#888',
  },
  linkText: {
    marginTop: 15,
    color: '#007AFF',
  },
  boldLink: {
    fontWeight: 'bold',
  },
});

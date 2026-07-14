import { useAppColors } from '@/hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import { getApiUrl } from '../../utils/ip_config';

export default function LoginScreen() {
  const { login } = useAuth();
  const colors = useAppColors();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [emailError, setEmailError] = useState('');

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) return '';
    return emailRegex.test(value) ? '' : t('email_invalid', 'El correo electrónico no es válido.');
  };

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
      Toast.show({ type: 'error', text1: t('config_error', 'Error de Configuración'), text2: error.message || t('google_init_error', 'No se pudo inicializar Google Sign-In.'), visibilityTime: 4000 });
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
          await login(data.token, data.refreshToken, data.user.rol, data.user);
        } else {
          Toast.show({ type: 'error', text1: t('auth_error', 'Error de autenticación'), text2: data.message || t('google_auth_error', 'No se pudo iniciar sesión con Google.'), visibilityTime: 4000 });
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
        Toast.show({ type: 'error', text1: t('error', 'Error'), text2: t('google_play_error', 'Los servicios de Google Play no están disponibles.'), visibilityTime: 4000 });
      } else {
        Toast.show({ type: 'error', text1: t('auth_error', 'Error de autenticación'), text2: t('login_error', 'Ocurrió un error inesperado.'), visibilityTime: 4000 });
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await login(data.token, data.refreshToken, data.user.rol, data.user);
      } else {
        Toast.show({ type: 'error', text1: t('auth_error', 'Error de autenticación'), text2: data.message || t('invalid_credentials', 'Credenciales incorrectas'), visibilityTime: 4000 });
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: t('error_network', 'Error de Red'), text2: err.message || t('error_server', 'No se pudo contactar al servidor'), visibilityTime: 4000 });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.titleContainer}>
          <Image source={require('../../assets/images/abejanet.png')} style={styles.logo} />
          <Text style={[styles.titleText, { color: colors.text }]}>{t('welcome_login', 'Bienvenido a AbejaNet')}</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={[styles.inputContainer, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}>
            <TextInput
              style={[styles.input, { color: colors.inputText }]}
              placeholder={t('email', 'Correo Electrónico')}
              placeholderTextColor={colors.placeholder}
              value={email}
              onChangeText={(text) => { setEmail(text); setEmailError(''); }}
              onBlur={() => setEmailError(validateEmail(email))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          {emailError ? (
            <Text style={[styles.errorText, { color: colors.danger }]}>{emailError}</Text>
          ) : null}
          <View style={[styles.inputContainer, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}>
            <TextInput
              style={[styles.input, { color: colors.inputText }]}
              placeholder={t('password', 'Contraseña')}
              placeholderTextColor={colors.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!isPasswordVisible}
            />
            <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeIcon}>
              <Ionicons name={isPasswordVisible ? 'eye-off' : 'eye'} size={24} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleLogin} disabled={isLoading || isGoogleLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('login_button', 'Iniciar Sesión')}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.separatorContainer}>
            <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.separatorText, { color: colors.textTertiary }]}>{t('or', 'o')}</Text>
            <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
          </View>

          <TouchableOpacity style={[styles.button, styles.googleButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
            {isGoogleLoading ? (
                <ActivityIndicator color={colors.textSecondary} />
            ) : (
              <>
                <Image source={require('../../assets/images/google-logo.jpg')} style={styles.googleIcon} />
                <Text style={[styles.buttonText, { color: colors.text }]}>{t('continue_google', 'Continuar con Google')}</Text>
              </>
            )}
          </TouchableOpacity>

          <Pressable onPress={() => router.push('/(auth)/register')} disabled={isLoading || isGoogleLoading}>
            <Text style={[styles.linkText, { color: colors.primary }]}>
              {t('no_account', '¿No tienes una cuenta?')} <Text style={styles.boldLink}>{t('register_here', 'Regístrate aquí')}</Text>
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push('/(auth)/forgot-password' as any)} disabled={isLoading || isGoogleLoading}>
            <Text style={[styles.linkText, { color: colors.primary }]}>{t('forgot_password_link', '¿Olvidaste tu contraseña?')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  titleText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    resizeMode: 'cover',
    marginBottom: 20,
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 5,
  },
  button: {
    width: '90%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    height: 50,
    minHeight: 50,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  googleButton: {
    flexDirection: 'row',
    borderWidth: 1,
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    marginVertical: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
  },
  separatorText: {
    marginHorizontal: 10,
  },
  linkText: {
    marginTop: 15,
    fontSize: 16,
  },
  boldLink: {
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 12,
    marginBottom: 5,
    marginLeft: 20,
  },
});

import { useAppColors } from '@/hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { getApiUrl } from '../../utils/ip_config';

// --- Componente para mostrar un requisito de la contraseña ---
const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
  <View style={styles.requirementContainer}>
    <Ionicons name={met ? 'checkmark-circle' : 'close-circle-outline'} size={20} color={met ? '#22C55E' : '#EF4444'} />
    <Text style={[styles.requirementText, { color: met ? '#22C55E' : '#9CA3AF' }]}>{text}</Text>
  </View>
);

export default function RegisterScreen() {
  const colors = useAppColors();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Estados para la visibilidad de la contraseña (press-and-hold)
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Estados para los requisitos de la contraseña
  const [hasLength, setHasLength] = useState(false);
  const [hasNumber, setHasNumber] = useState(false);
  const [hasLowerCase, setHasLowerCase] = useState(false);
  const [hasUpperCase, setHasUpperCase] = useState(false);
  const [hasSpecialChar, setHasSpecialChar] = useState(false);
  
  const [api, setApi] = useState('');
  const [emailError, setEmailError] = useState('');

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) return '';
    return emailRegex.test(value) ? '' : t('email_invalid', 'El correo electrónico no es válido.');
  };

  useEffect(() => {
    const fetchApiUrl = async () => {
      const apiUrl = await getApiUrl();
      setApi(apiUrl);
    };
    fetchApiUrl();
  }, []);

  // Función para validar la contraseña y actualizar los estados de los requisitos
  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setHasLength(text.length >= 8);
    setHasNumber(/\d/.test(text));
    setHasLowerCase(/[a-z]/.test(text));
    setHasUpperCase(/[A-Z]/.test(text));
    setHasSpecialChar(/[!@#$%^&*(),.?":{}|<>]/.test(text));
  };

  const isPasswordSecure = hasLength && hasNumber && hasLowerCase && hasUpperCase && hasSpecialChar;

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Toast.show({ type: 'error', text1: t('error', 'Error'), text2: t('all_fields_required', 'Todos los campos son obligatorios.'), visibilityTime: 4000 });
      return;
    }
    if (password !== confirmPassword) {
      Toast.show({ type: 'error', text1: t('error', 'Error'), text2: t('passwords_dont_match_short', 'Las contraseñas no coinciden.'), visibilityTime: 4000 });
      return;
    }
    // Validación de contraseña segura
    if (!isPasswordSecure) {
      Toast.show({
        type: 'error',
        text1: t('insecure_password', 'Contraseña Insegura'),
        text2: t('insecure_password_msg', 'Por favor, cumple con todos los requisitos de la contraseña para continuar.'),
        visibilityTime: 4000
      });
      return;
    }
    if (!api) {
        Toast.show({ type: 'error', text1: t('error', 'Error'), text2: t('no_api_url', 'No se pudo obtener la URL del servidor. Inténtalo de nuevo.'), visibilityTime: 4000 });
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
        Toast.show({
          type: 'success',
          text1: t('register_success', 'Registro Exitoso'),
          text2: t('register_success_msg', 'Tu cuenta ha sido creada. Ahora puedes iniciar sesión.'),
          visibilityTime: 3000,
          onShow: () => setTimeout(() => router.push('/login'), 2000)
        });
      } else {
        Toast.show({ type: 'error', text1: t('register_error', 'Error de Registro'), text2: data.message || t('register_error_msg', 'No se pudo completar el registro.'), visibilityTime: 4000 });
      }
    } catch (error) {
      console.error('Error de red al registrar:', error);
      Toast.show({ type: 'error', text1: t('connection_error', 'Error de Conexión'), text2: t('connection_error_msg', 'No se pudo conectar con el servidor. Verifica tu conexión a internet.'), visibilityTime: 4000 });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={{ alignItems: 'center' }}>
          <Image
            source={require('@/assets/images/abejanet.png')}
            style={styles.logo}
          />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{t('create_account', 'Crea tu cuenta')}</Text>
        <TextInput
          placeholder={t('email', 'Correo electrónico')}
          placeholderTextColor={colors.placeholder}
          value={email}
          onChangeText={(text) => { setEmail(text); setEmailError(''); }}
          onBlur={() => setEmailError(validateEmail(email))}
          keyboardType="email-address"
          autoCapitalize="none"
          style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground, color: colors.inputText }]}
        />
        {emailError ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>{emailError}</Text>
        ) : null}
        
        {/* Campo de Contraseña con ícono y checklist */}
        <View style={[styles.passwordContainer, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}>
          <TextInput
            placeholder={t('password', 'Contraseña')}
            placeholderTextColor={colors.placeholder}
            value={password}
            onChangeText={handlePasswordChange}
            secureTextEntry={!showPassword}
            style={[styles.passwordInput, { color: colors.inputText }]}
          />
          <Pressable 
            onPressIn={() => setShowPassword(true)} 
            onPressOut={() => setShowPassword(false)} 
            style={styles.eyeIconContainer}
          >
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={24} color={colors.textTertiary} />
          </Pressable>
        </View>

        {/* Checklist de requisitos */}
        {password.length > 0 && (
            <View style={styles.requirementsList}>
              <PasswordRequirement met={hasLength} text={t('req_length', 'Al menos 8 caracteres')} />
              <PasswordRequirement met={hasLowerCase} text={t('req_lowercase', 'Al menos una letra minúscula')} />
              <PasswordRequirement met={hasUpperCase} text={t('req_uppercase', 'Al menos una letra mayúscula')} />
              <PasswordRequirement met={hasNumber} text={t('req_number', 'Al menos un número')} />
              <PasswordRequirement met={hasSpecialChar} text={t('req_special', 'Al menos un carácter especial')} />
           </View>
        )}

        {/* Campo de Confirmar Contraseña con ícono */}
        <View style={[styles.passwordContainer, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}>
          <TextInput
            placeholder={t('confirm_password_placeholder', 'Confirmar Contraseña')}
            placeholderTextColor={colors.placeholder}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            style={[styles.passwordInput, { color: colors.inputText }]}
          />
          <Pressable 
            onPressIn={() => setShowConfirmPassword(true)} 
            onPressOut={() => setShowConfirmPassword(false)} 
            style={styles.eyeIconContainer}
          >
            <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={24} color={colors.textTertiary} />
          </Pressable>
        </View>

        <Pressable style={[styles.button, { backgroundColor: colors.accent }]} onPress={handleRegister}>
          <Text style={styles.buttonText}>{t('create_account_button', 'Crear cuenta')}</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/login')} style={styles.loginLink}>
          <Text style={[styles.linkText, { color: colors.primary }]}>{t('have_account', '¿Ya tienes una cuenta? Inicia sesión')}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  eyeIconContainer: {
    padding: 12,
  },
  // Checklist
  requirementsList: {
    marginTop: -5,
    marginBottom: 15,
    paddingLeft: 10,
    gap: 5,
  },
  requirementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementText: {
    fontSize: 14,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginLink: {
    marginTop: 20,
    alignSelf: 'center',
  },
  linkText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 5,
    marginLeft: 15,
  },
});

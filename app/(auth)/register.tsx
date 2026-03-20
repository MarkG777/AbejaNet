import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Pressable, Alert, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { getApiUrl } from '../../utils/ip_config';
import { useAppColors } from '@/hooks/useAppColors';

// --- Componente para mostrar un requisito de la contraseña ---
const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
  <View style={styles.requirementContainer}>
    <Ionicons name={met ? 'checkmark-circle' : 'close-circle-outline'} size={20} color={met ? '#22C55E' : '#EF4444'} />
    <Text style={[styles.requirementText, { color: met ? '#22C55E' : '#9CA3AF' }]}>{text}</Text>
  </View>
);

export default function RegisterScreen() {
  const colors = useAppColors();
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
      Alert.alert('Error', 'Todos los campos son obligatorios.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }
    // Validación de contraseña segura
    if (!isPasswordSecure) {
      Alert.alert(
        'Contraseña Insegura',
        'Por favor, cumple con todos los requisitos de la contraseña para continuar.'
      );
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
        <Text style={[styles.title, { color: colors.text }]}>Crea tu cuenta</Text>
        <TextInput
          placeholder="Correo electrónico"
          placeholderTextColor={colors.placeholder}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground, color: colors.inputText }]}
        />
        
        {/* Campo de Contraseña con ícono y checklist */}
        <View style={[styles.passwordContainer, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}>
          <TextInput
            placeholder="Contraseña"
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
              <PasswordRequirement met={hasLength} text="Al menos 8 caracteres" />
              <PasswordRequirement met={hasLowerCase} text="Al menos una letra minúscula" />
              <PasswordRequirement met={hasUpperCase} text="Al menos una letra mayúscula" />
              <PasswordRequirement met={hasNumber} text="Al menos un número" />
              <PasswordRequirement met={hasSpecialChar} text="Al menos un carácter especial" />
           </View>
        )}

        {/* Campo de Confirmar Contraseña con ícono */}
        <View style={[styles.passwordContainer, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}>
          <TextInput
            placeholder="Confirmar Contraseña"
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
          <Text style={styles.buttonText}>Crear cuenta</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/login')} style={styles.loginLink}>
          <Text style={[styles.linkText, { color: colors.primary }]}>¿Ya tienes una cuenta? Inicia sesión</Text>
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
});

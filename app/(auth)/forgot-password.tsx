import { useAppColors } from '@/hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { getApiUrl } from '../../utils/ip_config';

type Step = 'email' | 'code' | 'password';

export default function ForgotPasswordScreen() {
  const colors = useAppColors();
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) return '';
    return emailRegex.test(value) ? '' : t('email_invalid', 'El correo electrónico no es válido.');
  };

  const handleSendCode = async () => {
    if (!email.trim()) {
      Toast.show({ type: 'error', text1: t('error', 'Error'), text2: t('email_required', 'Por favor, introduce tu correo electrónico.'), visibilityTime: 4000 });
      return;
    }
    setIsLoading(true);
    try {
      const api = await getApiUrl();
      const res = await fetch(`${api}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (data.success) {
        setStep('code');
      } else {
        Toast.show({ type: 'error', text1: t('error', 'Error'), text2: data.message, visibilityTime: 4000 });
      }
    } catch {
      Toast.show({ type: 'error', text1: t('error_network', 'Error de Red'), text2: t('error_server', 'No se pudo conectar con el servidor.'), visibilityTime: 4000 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = () => {
    if (!code.trim() || code.trim().length !== 6) {
      Toast.show({ type: 'error', text1: t('error', 'Error'), text2: t('code_required', 'Por favor, introduce el código de verificación.'), visibilityTime: 4000 });
      return;
    }
    setStep('password');
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Toast.show({ type: 'error', text1: t('error', 'Error'), text2: t('fill_all_fields', 'Completa todos los campos.'), visibilityTime: 4000 });
      return;
    }
    if (newPassword.length < 6) {
      Toast.show({ type: 'error', text1: t('error', 'Error'), text2: t('password_min_length', 'La nueva contraseña debe tener al menos 6 caracteres.'), visibilityTime: 4000 });
      return;
    }
    if (newPassword !== confirmPassword) {
      Toast.show({ type: 'error', text1: t('error', 'Error'), text2: t('passwords_dont_match', 'Las contraseñas nuevas no coinciden.'), visibilityTime: 4000 });
      return;
    }
    setIsLoading(true);
    try {
      const api = await getApiUrl();
      const res = await fetch(`${api}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim(), newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        Toast.show({
          type: 'success',
          text1: t('success', 'Éxito'),
          text2: t('password_reset_success', 'Tu contraseña ha sido restablecida. Ya puedes iniciar sesión.'),
          visibilityTime: 3000,
          onShow: () => setTimeout(() => router.back(), 2000)
        });
      } else {
        Toast.show({ type: 'error', text1: t('error', 'Error'), text2: data.message, visibilityTime: 4000 });
      }
    } catch {
      Toast.show({ type: 'error', text1: t('error_network', 'Error de Red'), text2: t('error_server', 'No se pudo conectar con el servidor.'), visibilityTime: 4000 });
    } finally {
      setIsLoading(false);
    }
  };

  const renderEmailStep = () => (
    <>
      <Text style={[styles.title, { color: colors.text }]}>{t('forgot_password', 'Recuperar Contraseña')}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('forgot_password_subtitle', 'Introduce tu correo electrónico y te enviaremos un código de verificación.')}</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground, color: colors.inputText }]}
        placeholder={t('email_placeholder', 'tu@email.com')}
        placeholderTextColor={colors.placeholder}
        value={email}
        onChangeText={(text) => { setEmail(text); setEmailError(''); }}
        onBlur={() => setEmailError(validateEmail(email))}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {emailError ? (
        <Text style={[styles.errorText, { color: colors.danger }]}>{emailError}</Text>
      ) : null}
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 15 }} />
      ) : (
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSendCode}>
          <Text style={styles.buttonText}>{t('send_code', 'Enviar Código')}</Text>
        </TouchableOpacity>
      )}
    </>
  );

  const renderCodeStep = () => (
    <>
      <View style={styles.iconContainer}>
        <Ionicons name="mail-open-outline" size={48} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{t('enter_code_title', 'Verificar Código')}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t('enter_code_subtitle', 'Ingresa el código de 6 dígitos que enviamos a:')}
      </Text>
      <Text style={[styles.emailHighlight, { color: colors.text }]}>{email}</Text>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('code_label', 'Código de verificación')}</Text>
      <TextInput
        style={[styles.input, styles.codeInput, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground, color: colors.inputText }]}
        placeholder="000000"
        placeholderTextColor={colors.placeholder}
        value={code}
        onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        maxLength={6}
      />
      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleVerifyCode}>
        <Text style={styles.buttonText}>{t('verify_code', 'Verificar')}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleSendCode} disabled={isLoading}>
        <Text style={[styles.resendText, { color: colors.primary }]}>{isLoading ? '...' : t('resend_code', 'Reenviar Código')}</Text>
      </TouchableOpacity>
    </>
  );

  const renderPasswordStep = () => (
    <>
      <Text style={[styles.title, { color: colors.text }]}>{t('new_password_title', 'Nueva Contraseña')}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('new_password_subtitle', 'Ingresa tu nueva contraseña.')}</Text>
      <View style={{ position: 'relative' }}>
        <TextInput
          style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground, color: colors.inputText, paddingRight: 50 }]}
          placeholder={t('min_6_chars', 'Mínimo 6 caracteres')}
          placeholderTextColor={colors.placeholder}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showPw}
        />
        <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeIcon}>
          <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <TextInput
        style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground, color: colors.inputText }]}
        placeholder={t('confirm_password', 'Confirmar nueva contraseña')}
        placeholderTextColor={colors.placeholder}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry={!showPw}
      />
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 15 }} />
      ) : (
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleResetPassword}>
          <Text style={styles.buttonText}>{t('reset_password', 'Restablecer Contraseña')}</Text>
        </TouchableOpacity>
      )}
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {step === 'email' && renderEmailStep()}
      {step === 'code' && renderCodeStep()}
      {step === 'password' && renderPasswordStep()}
      <TouchableOpacity style={[styles.buttonSecondary, { borderColor: colors.border }]} onPress={() => {
        if (step === 'email') router.back();
        else if (step === 'code') setStep('email');
        else setStep('code');
      }}>
        <Text style={[styles.buttonSecondaryText, { color: colors.primary }]}>
          {step === 'email' ? t('back_to_login', 'Volver a Inicio de Sesión') : t('cancel', 'Cancelar')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 28,
    letterSpacing: 12,
    height: 60,
    marginBottom: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  emailHighlight: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 4,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonSecondary: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonSecondaryText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 14,
  },
  resendText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 5,
  },
});

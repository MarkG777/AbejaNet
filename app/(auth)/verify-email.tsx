import { useAppColors } from '@/hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import { getApiUrl } from '../../utils/ip_config';
import { limpiarRegistroPendiente, obtenerRegistroPendiente } from '../../utils/pendingRegistration';

const SEGUNDOS_ENTRE_ENVIOS = 60;

// Confirma el correo con el código que llegó al buzón. La contraseña que la persona escribió al registrarse viaja junto
// con el código (el servidor solo la guarda cuando el código es correcto) y, al confirmar, la app inicia sesión sola.
export default function VerifyEmailScreen() {
  const colors = useAppColors();
  const { t } = useTranslation();
  const { login } = useAuth();
  const params = useLocalSearchParams<{ email?: string; auto?: string }>();
  const email = String(params.email || '').trim().toLowerCase();

  const [guardado] = useState(() => obtenerRegistroPendiente(email));
  const [password, setPassword] = useState(guardado?.password ?? '');
  const [showPw, setShowPw] = useState(false);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [espera, setEspera] = useState(params.auto === '1' ? 0 : SEGUNDOS_ENTRE_ENVIOS);
  const yaPidioCodigo = useRef(false);

  // Cuenta regresiva para poder pedir otro código.
  useEffect(() => {
    if (espera <= 0) return;
    const id = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [espera]);

  const pedirCodigo = async (silencioso = false) => {
    if (!email) return;
    setIsSending(true);
    try {
      const api = await getApiUrl();
      const res = await fetch(`${api}/api/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo_electronico: email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEspera(SEGUNDOS_ENTRE_ENVIOS);
        if (!silencioso || !data.esperar) {
          Toast.show({ type: 'success', text1: t('verify_email_sent', 'Código enviado'), text2: data.message, visibilityTime: 4000 });
        }
      } else {
        Toast.show({ type: 'error', text1: t('error', 'Error'), text2: data.message || t('error_server', 'No se pudo conectar con el servidor.'), visibilityTime: 4000 });
      }
    } catch {
      Toast.show({ type: 'error', text1: t('error_network', 'Error de Red'), text2: t('error_server', 'No se pudo conectar con el servidor.'), visibilityTime: 4000 });
    } finally {
      setIsSending(false);
    }
  };

  // Si llegó desde el inicio de sesión (la cuenta quedó pendiente de una vez anterior), se manda un código nuevo de entrada.
  useEffect(() => {
    if (params.auto === '1' && !yaPidioCodigo.current) {
      yaPidioCodigo.current = true;
      pedirCodigo(true);
    }
  }, []);

  const confirmar = async () => {
    if (code.trim().length !== 6) {
      Toast.show({ type: 'error', text1: t('error', 'Error'), text2: t('code_required', 'Por favor, introduce el código de verificación.'), visibilityTime: 4000 });
      return;
    }
    if (password.length < 8) {
      Toast.show({ type: 'error', text1: t('error', 'Error'), text2: t('verify_email_password_needed', 'Escribe la contraseña que quieres usar (mínimo 8 caracteres).'), visibilityTime: 4000 });
      return;
    }
    setIsLoading(true);
    try {
      const api = await getApiUrl();
      const res = await fetch(`${api}/api/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo_electronico: email, codigo: code.trim(), contrasena: password }),
      });
      const data = await res.json();
      if (!(res.ok && data.success)) {
        Toast.show({ type: 'error', text1: t('error', 'Error'), text2: data.message || t('error_generic', 'Ocurrió un error inesperado.'), visibilityTime: 5000 });
        if (data.motivo === 'bloqueado' || data.motivo === 'expirado' || data.motivo === 'sin_codigo') setCode('');
        return;
      }

      // Correo confirmado y contraseña fijada: se inicia sesión sola (esto también registra el token de notificaciones).
      const loginRes = await fetch(`${api}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json();
      limpiarRegistroPendiente();
      if (loginRes.ok && loginData.success) {
        await login(loginData.token, loginData.refreshToken, loginData.user.rol, loginData.user);
      } else {
        Toast.show({ type: 'success', text1: t('verify_email_done', 'Correo confirmado'), text2: t('verify_email_done_msg', 'Ya puedes iniciar sesión.'), visibilityTime: 4000 });
        router.replace('/(auth)/login' as any);
      }
    } catch {
      Toast.show({ type: 'error', text1: t('error_network', 'Error de Red'), text2: t('error_server', 'No se pudo conectar con el servidor.'), visibilityTime: 4000 });
    } finally {
      setIsLoading(false);
    }
  };

  const volver = () => {
    limpiarRegistroPendiente();
    router.replace('/(auth)/login' as any);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.iconContainer}>
          <Ionicons name="mail-open-outline" size={48} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">{t('verify_email_title', 'Confirma tu correo')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('verify_email_subtitle', 'Te enviamos un código de 6 dígitos a:')}
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
          accessibilityLabel={t('code_label', 'Código de verificación')}
        />

        {/* Solo se pide la contraseña si no está en memoria (p. ej. la app se cerró mientras se esperaba el correo). */}
        {!guardado && (
          <>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('password', 'Contraseña')}</Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground, color: colors.inputText, paddingRight: 50 }]}
                placeholder={t('verify_email_password_placeholder', 'La contraseña que elegiste')}
                placeholderTextColor={colors.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                autoCapitalize="none"
                accessibilityLabel={t('password', 'Contraseña')}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeIcon} accessibilityRole="button" accessibilityLabel={showPw ? t('hide_password', 'Ocultar contraseña') : t('show_password', 'Mostrar contraseña')}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 15 }} />
        ) : (
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={confirmar} accessibilityRole="button">
            <Text style={styles.buttonText}>{t('verify_email_confirm', 'Confirmar')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => pedirCodigo(false)} disabled={isSending || espera > 0} accessibilityRole="button">
          <Text style={[styles.resendText, { color: espera > 0 || isSending ? colors.textTertiary : colors.primary }]}>
            {isSending ? '...' : espera > 0 ? t('verify_email_resend_in', 'Reenviar código en {{s}} s', { s: espera }) : t('resend_code', 'Reenviar Código')}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.hint, { color: colors.textTertiary }]}>{t('verify_email_hint', 'Revisa también la carpeta de spam. El código vence en 15 minutos.')}</Text>

        <TouchableOpacity style={[styles.buttonSecondary, { borderColor: colors.border }]} onPress={volver} accessibilityRole="button">
          <Text style={[styles.buttonSecondaryText, { color: colors.primary }]}>{t('back_to_login', 'Volver a Inicio de Sesión')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  iconContainer: { alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 8 },
  emailHighlight: { fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 24 },
  inputLabel: { fontSize: 13, marginBottom: 8, marginLeft: 4 },
  input: { height: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, marginBottom: 20, fontSize: 16 },
  codeInput: { textAlign: 'center', fontSize: 28, letterSpacing: 12, height: 60, marginBottom: 24 },
  button: { padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  buttonSecondary: { padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, marginTop: 8 },
  buttonSecondaryText: { fontWeight: 'bold', fontSize: 16 },
  eyeIcon: { position: 'absolute', right: 15, top: 14 },
  resendText: { textAlign: 'center', fontSize: 14, marginTop: 8, marginBottom: 12 },
  hint: { textAlign: 'center', fontSize: 12, marginBottom: 20 },
});

import { useAppColors } from '@/hooks/useAppColors';
import { registerForPushNotificationsAsync, savePushToken } from '@/services/notificationService';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * Las alertas de las colmenas son importantes y SOLO llegan como notificación push. Si el permiso de
 * notificaciones está desactivado, las alertas aparecerían en la lista sin que el teléfono avisara.
 * Este aviso se muestra mientras el permiso no esté concedido y ofrece activarlo (o abrir los ajustes del
 * sistema cuando Android ya no permite volver a preguntar). Desaparece solo al concederlo.
 */
export default function PushPermissionBanner() {
  const colors = useAppColors();
  const { t } = useTranslation();
  const [desactivadas, setDesactivadas] = useState(false);
  const [puedePreguntar, setPuedePreguntar] = useState(true);

  const revisar = useCallback(async () => {
    try {
      const permisos = await Notifications.getPermissionsAsync();
      setDesactivadas(permisos.status !== 'granted');
      setPuedePreguntar(permisos.canAskAgain !== false);
    } catch {
      // Si no se puede consultar, no se molesta al usuario con un aviso incierto.
    }
  }, []);

  useEffect(() => {
    revisar();
    // Al volver de los ajustes del sistema se vuelve a comprobar.
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') revisar();
    });
    return () => sub.remove();
  }, [revisar]);

  if (!desactivadas) return null;

  const activar = async () => {
    if (puedePreguntar) {
      const token = await registerForPushNotificationsAsync(); // pide el permiso y obtiene el token
      if (token) await savePushToken(token);
      await revisar();
    } else {
      Linking.openSettings();
    }
  };

  const textoBoton = puedePreguntar ? t('push_enable', 'Activar') : t('push_open_settings', 'Abrir ajustes');

  return (
    <View style={[styles.contenedor, { backgroundColor: colors.card }]} accessibilityRole="alert">
      <Ionicons name="notifications-off-outline" size={26} color="#F59E0B" />
      <View style={styles.textos}>
        <Text style={[styles.titulo, { color: colors.text }]}>{t('push_disabled_title', 'Notificaciones desactivadas')}</Text>
        <Text style={[styles.mensaje, { color: colors.textSecondary }]}>
          {t('push_disabled_msg', 'No te avisaremos de las alertas de tus colmenas. Actívalas para recibirlas en tu celular.')}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.boton, { backgroundColor: colors.primary }]}
        onPress={activar}
        accessibilityRole="button"
        accessibilityLabel={textoBoton}
      >
        <Text style={styles.botonTexto}>{textoBoton}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  textos: { flex: 1 },
  titulo: { fontSize: 14, fontWeight: '700' },
  mensaje: { fontSize: 12, marginTop: 2 },
  boton: { paddingHorizontal: 12, minHeight: 40, justifyContent: 'center', borderRadius: 8 },
  botonTexto: { color: '#fff', fontWeight: '600', fontSize: 13 },
});

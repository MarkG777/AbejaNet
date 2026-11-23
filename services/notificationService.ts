import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import api from '../utils/api';

// Configuración inicial para las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// `pedirPermiso: false` obtiene el token solo si el permiso YA está concedido, sin mostrar ningún diálogo (se usa al volver
// a primer plano; el permiso se pide al iniciar sesión y desde el aviso de la pantalla de alertas).
export async function registerForPushNotificationsAsync(opciones: { pedirPermiso?: boolean } = {}): Promise<string | null> {
  const { pedirPermiso = true } = opciones;
  let token;

  // Es necesario configurar el canal para Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FFC107',
    });
  }

  // Se necesita el projectId para obtener el token. Lo obtenemos de la configuración de Expo.
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn('Error: projectId no encontrado en app.json. No se puede obtener el push token.');
    alert('Error de configuración: No se pueden habilitar las notificaciones en este momento.');
    return null;
  }

  // Pedimos permisos al usuario
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted' && pedirPermiso) {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    // Sin permiso no hay push. Ya no se muestra un alert() bloqueante en cada arranque: la app muestra un aviso
    // permanente con un botón para activarlas (components/PushPermissionBanner.tsx).
    console.warn('Permiso de notificaciones no concedido: no se recibirán alertas push.');
    return null;
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('----------- TOKEN DE NOTIFICACIÓN -----------');
    console.log(token);
    console.log('-------------------------------------------');
    return token;
  } catch (error) {
    console.error("Error al obtener el token de notificación:", error);
    return null;
  }
}

// Último token que el servidor confirmó haber guardado en esta sesión de la app, y cuándo.
let ultimoTokenGuardado: string | null = null;
let ultimoGuardadoEn = 0;
let ultimoIntentoEn = 0;
const REGUARDAR_CADA_MS = 30 * 60 * 1000; // por si el servidor borró el token (p. ej. el teléfono dejó de ser válido)
const ENTRE_INTENTOS_MS = 60 * 1000;

// Función para enviar el token al backend. Devuelve true si el servidor lo guardó.
export async function savePushToken(token: string): Promise<boolean> {
    try {
        await api.post('/api/save-push-token', { token });
        ultimoTokenGuardado = token;
        ultimoGuardadoEn = Date.now();
        console.log('Token de notificaciones guardado en el backend.');
        return true;
    } catch (error) {
        console.error('Error al guardar el token de notificaciones en el backend:', error);
        return false;
    }
}

// Al volver a primer plano: si el token no llegó a guardarse (falló la red o el registro al iniciar sesión) o hace mucho
// que no se confirma, se vuelve a intentar. No pide permisos ni muestra nada. Máximo un intento por minuto.
export async function sincronizarPushToken(): Promise<void> {
  const ahora = Date.now();
  if (ahora - ultimoIntentoEn < ENTRE_INTENTOS_MS) return;
  ultimoIntentoEn = ahora;
  try {
    const token = await registerForPushNotificationsAsync({ pedirPermiso: false });
    if (token && (token !== ultimoTokenGuardado || ahora - ultimoGuardadoEn > REGUARDAR_CADA_MS)) {
      await savePushToken(token);
    }
  } catch (error) {
    console.warn('No se pudo sincronizar el token de notificaciones:', error);
  }
}

// Al cerrar sesión: el siguiente usuario del mismo teléfono debe volver a registrar el token.
export function olvidarPushToken() {
  ultimoTokenGuardado = null;
  ultimoGuardadoEn = 0;
  ultimoIntentoEn = 0;
}

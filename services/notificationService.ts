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

export async function registerForPushNotificationsAsync(): Promise<string | null> {
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

  // --- INICIO: LOG DE DIAGNÓSTICO ---
  console.log('Contenido de Constants.expoConfig:', JSON.stringify(Constants.expoConfig, null, 2));
  // --- FIN: LOG DE DIAGNÓSTICO ---

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

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    alert('¡Atención! Para recibir alertas en tiempo real, necesitas habilitar los permisos de notificación.');
    return null;
  }

  // Obtenemos el token
  try {
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('Token de Notificaciones Expo:', token);
  } catch (e) {
    console.error("Error al obtener el token de notificación:", e);
    alert('No se pudo registrar para notificaciones.');
    return null;
  }
  
  return token;
}

// Función para enviar el token al backend
export async function savePushToken(token: string) {
    try {
        await api.post('/api/save-push-token', { token });
        console.log('Token de notificaciones guardado en el backend.');
    } catch (error) {
        console.error('Error al guardar el token de notificaciones en el backend:', error);
    }
}

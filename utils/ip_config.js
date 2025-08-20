// ip_config.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// Valor por defecto (puedes cambiarlo si lo necesitas)
// --- Elige a qué servidor te quieres conectar ---

// Opción 1: Conectar al servidor de producción de la escuela
//const DEFAULT_API_BASE_URL = "http://172.31.112.10:3000";

// Opción 2: Conectar al servidor de desarrollo en tu VM local
// const DEFAULT_API_BASE_URL = "http://172.31.112.6:3000";

// Opción 3: Conectar al servidor de desarrollo en tu VM local (casa)
export const DEFAULT_API_BASE_URL = 'https://abejanet-backend.onrender.com';

export async function setApiUrl(url) {
  await AsyncStorage.setItem('API_BASE_URL', url);
}

export async function getApiUrl() {
  const url = await AsyncStorage.getItem('API_BASE_URL');
  return url || DEFAULT_API_BASE_URL;
}
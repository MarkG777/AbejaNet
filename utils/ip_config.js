// ip_config.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// Valor por defecto (puedes cambiarlo si lo necesitas)
// --- Elige a qué servidor te quieres conectar ---

// Se usará la URL de Render para todos los entornos (desarrollo y producción).
export const DEFAULT_API_BASE_URL = 'https://abejanet-backend.onrender.com';

export async function setApiUrl(url) {
  await AsyncStorage.setItem('API_BASE_URL', url);
}

export async function getApiUrl() {
  const url = await AsyncStorage.getItem('API_BASE_URL');
  return url || DEFAULT_API_BASE_URL;
}
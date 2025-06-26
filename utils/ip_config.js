// ip_config.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// Valor por defecto (puedes cambiarlo si lo necesitas)
// La IP del servidor Debian donde ahora corre el backend
const DEFAULT_API_BASE_URL = "http://172.31.112.10:3000"; // IP del servidor escuela
//const DEFAULT_API_BASE_URL = "http://172.31.112.10:3000"; // IP del servidor (maquina virtual)

export async function setApiUrl(url) {
  await AsyncStorage.setItem('API_BASE_URL', url);
}

export async function getApiUrl() {
  const url = await AsyncStorage.getItem('API_BASE_URL');
  return url || DEFAULT_API_BASE_URL;
}
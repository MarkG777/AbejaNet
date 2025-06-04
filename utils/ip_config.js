// ip_config.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// Valor por defecto (puedes cambiarlo si lo necesitas)
const DEFAULT_API_BASE_URL = "http://172.31.112.3:3000";

export async function setApiUrl(url) {
  await AsyncStorage.setItem('API_BASE_URL', url);
}

export async function getApiUrl() {
  const url = await AsyncStorage.getItem('API_BASE_URL');
  return url || DEFAULT_API_BASE_URL;
}
import axios from 'axios';
import { getApiUrl } from './ip_config';

// 1. Creamos una instancia de Axios SIN una baseURL fija.
// La baseURL se establecerá dinámicamente para cada petición.
const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Interceptor de PETICIONES para establecer la baseURL y el token dinámicamente.
// Esto se ejecuta ANTES de que cada petición sea enviada.
api.interceptors.request.use(
  async (config) => {
    // Obtenemos la URL de la API de forma asíncrona para asegurar que esté disponible.
    const apiUrl = await getApiUrl();
    if (apiUrl) {
      config.baseURL = apiUrl;
    } else {
      // Si no hay URL, cancelamos la petición para evitar errores.
      console.error('¡Error crítico! La URL de la API no está configurada.');
      return Promise.reject(new axios.Cancel('La URL de la API no está disponible.'));
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. Función para establecer el token dinámicamente en las cabeceras
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// 4. Creamos el interceptor de RESPUESTAS para manejar la expiración de sesión
export const setupLogoutOnSessionExpired = (logoutUser) => {
  api.interceptors.response.use(
    // Si la respuesta es exitosa, simplemente la devolvemos
    (response) => response,
    // Si hay un error, lo interceptamos
    (error) => {
      // Verificamos si el error es por sesión expirada (401) o prohibido (403)
      if (error.response && [401, 403].includes(error.response.status)) {
        console.log('Interceptor: Sesión expirada o no autorizada. Deslogueando...');
        logoutUser(); // ¡Aquí ocurre la magia! Llamamos a la función de logout.
      }
      // Devolvemos el error para que el componente que hizo la llamada también pueda manejarlo si es necesario
      return Promise.reject(error);
    }
  );
};

export default api;

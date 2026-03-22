import axios from 'axios';
import { getApiUrl } from './ip_config';

const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const apiUrl = await getApiUrl();
    if (apiUrl) {
      config.baseURL = apiUrl;
    } else {
      console.error('¡Error crítico! La URL de la API no está configurada.');
      return Promise.reject(new axios.Cancel('La URL de la API no está disponible.'));
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const setupErrorInterceptor = (logoutUser, handleRefresh) => {
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      if (error.response && error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          console.log('Interceptor: Error 401. Solicitando Refresco Silencioso de Token...');
          const newToken = await handleRefresh();
          
          if (newToken) {
            console.log('Interceptor: Renobación Máxima de Token lograda. Re-escrutando petición original.');
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        } catch (refreshErr) {
          console.log('Interceptor: El Refresh Token Murió Criptográficamente. Deslogueando...');
          logoutUser();
          return Promise.reject(refreshErr);
        }
      }
      
      if (error.response && error.response.status === 403) {
         logoutUser();
      }
      
      return Promise.reject(error);
    }
  );
};

export default api;

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
  let isLoggingOut = false;
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      const isRefreshRequest = originalRequest?.url?.includes('/api/refresh-token');

      if (error.response && error.response.status === 401 && isRefreshRequest) {
        if (!isLoggingOut) {
          isLoggingOut = true;
          console.log('Interceptor: Refresh token invalido (401 en /api/refresh-token). Cerrando sesion...');
          logoutUser();
        }
        return Promise.reject(error);
      }

      if (error.response && error.response.status === 401 && !originalRequest._retry) {
        if (isLoggingOut) {
          return Promise.reject(error);
        }
        originalRequest._retry = true;
        try {
          console.log('Interceptor: Error 401. Renovando token...');
          const newToken = await handleRefresh();
          
          if (newToken) {
            console.log('Interceptor: Token renovado. Reintentando peticion original.');
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        } catch (refreshErr) {
          if (!isLoggingOut) {
            isLoggingOut = true;
            console.log('Interceptor: Refresh token invalido. Cerrando sesion...');
            logoutUser();
          }
          return Promise.reject(refreshErr);
        }
      }
      
      if (error.response && error.response.status === 403) {
         if (!isLoggingOut) {
           isLoggingOut = true;
           logoutUser();
         }
      }
      
      return Promise.reject(error);
    }
  );
};

export default api;

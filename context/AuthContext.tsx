// c:/Proyectos/AbejaNet/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setAuthToken, setupLogoutOnSessionExpired } from '../utils/api'; // IMPORTAMOS NUESTRO GUARDIÁN
import { registerForPushNotificationsAsync, savePushToken } from '../services/notificationService';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Definimos la forma del estado de autenticación y las funciones que proveerá el contexto
// Definimos la forma de los datos del usuario
interface User {
  id: number;
  nombre: string | null;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  correo_electronico: string;
}

// Definimos la forma del estado de autenticación y las funciones que proveerá el contexto
interface AuthContextData {
  authState: { 
    accessToken: string | null;
    authenticated: boolean | null; // null mientras se verifica, luego true o false
    userRole: 'administrador' | 'usuario' | null; // Roles que manejes
    user: User | null;
  };
  login: (token: string, role: 'administrador' | 'usuario', user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (newUserData: Partial<User>) => Promise<void>; // NUEVO: Para actualizar el perfil
}

// Creamos el contexto con un valor inicial undefined, ya que se proveerá más adelante
const AuthContext = createContext<AuthContextData | undefined>(undefined);

// Creamos el componente Proveedor del Contexto
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [authState, setAuthState] = useState<AuthContextData['authState']>({
    accessToken: null,
    authenticated: null, // Inicia como null hasta que se verifique desde AsyncStorage
    userRole: null,
    user: null,
  });

  const scheduleAutoLogout = (token: string) => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }

    try {
      const decodedToken = jwtDecode<{ exp: number }>(token);
      const expirationTime = decodedToken.exp * 1000;
      const currentTime = Date.now();
      const timeoutDuration = expirationTime - currentTime;

      if (timeoutDuration > 0) {
        console.log(`AuthContext: Programando logout automático en ${(timeoutDuration / 1000).toFixed(0)} segundos.`);
        sessionTimeoutRef.current = setTimeout(() => {
          console.log('AuthContext: ¡Sesión expirada! Ejecutando logout automático proactivo.');
          logout();
        }, timeoutDuration);
      } else {
        console.log('AuthContext: El token cargado ya ha expirado. Deslogueando...');
        logout(); // Llamada directa a logout si el token ya expiró
      }
    } catch (error) {
      console.error('AuthContext: Error decodificando el token. No se puede programar el logout.', error);
    }
  };

  // useEffect para cargar el estado de autenticación desde AsyncStorage al iniciar la app
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        console.log('AuthContext: Attempting to load auth state...');
        const token = await AsyncStorage.getItem('accessToken');
        const role = await AsyncStorage.getItem('userRole') as 'administrador' | 'usuario' | null;
        const userString = await AsyncStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;

        console.log('AuthContext: Loaded from AsyncStorage - Token:', token, 'Role:', role);
        if (token && role && user) {
          setAuthToken(token); // <-- AÑADIDO: Configuramos el token en axios
          setAuthState({
            accessToken: token,
            authenticated: true,
            userRole: role,
            user: user,
          });
          console.log('AuthContext: User is authenticated based on stored data.');
          scheduleAutoLogout(token);

          // Asegurarse de registrar para notificaciones al cargar la app
          console.log('AuthContext: Verificando registro de notificaciones al iniciar...');
          const pushToken = await registerForPushNotificationsAsync();
          if (pushToken) {
            console.log('AuthContext: Token de notificación verificado, guardando en backend...');
            await savePushToken(pushToken);
          } else {
            console.log('AuthContext: No se obtuvo token de notificación al iniciar.');
          }
        } else {
          setAuthState({
            accessToken: null,
            authenticated: false,
            userRole: null,
            user: null,
          });
          console.log('AuthContext: No valid token/role found, user is not authenticated.');
        }
      } catch (e) {
        console.error('Failed to load auth state from storage', e);
        setAuthState({
          accessToken: null,
          authenticated: false,
          userRole: null,
          user: null,
        });
      }
    };

    loadAuthState();

    // Configuramos el interceptor una sola vez cuando el proveedor se monta
    console.log('AuthContext: Setting up API interceptor...');
    setupLogoutOnSessionExpired(logout); // Le pasamos la función logout de este contexto

  }, []); // El array vacío asegura que esto se ejecute solo una vez

  // Función para manejar el inicio de sesión
  const login = async (token: string, role: 'administrador' | 'usuario', user: User) => {
    try {
      await AsyncStorage.setItem('accessToken', token);
      await AsyncStorage.setItem('userRole', role);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      setAuthToken(token); // <-- AÑADIDO: Configuramos el token en axios
      setAuthState({
        accessToken: token,
        authenticated: true,
        userRole: role,
        user: user,
      });
      scheduleAutoLogout(token);

      // Registrar para notificaciones push después de un login exitoso
      console.log('AuthContext: Intentando registrar para notificaciones push...');
      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken) {
        console.log('AuthContext: Token obtenido, intentando guardarlo en el backend...');
        await savePushToken(pushToken);
      } else {
        console.log('AuthContext: No se obtuvo push token, el usuario podría haber denegado los permisos.');
      }

    } catch (e) {
      console.error('Failed to save auth state to storage', e);
      // Aquí podrías manejar el error, quizás mostrando un mensaje al usuario
    }
  };

  // Función para manejar el cierre de sesión
  const logout = async () => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
        console.log('AuthContext: logout initiated');
    try {
      // Intentar cerrar la sesión de Google. Es seguro llamarlo incluso si no hay sesión.
      await GoogleSignin.signOut();
      console.log('AuthContext: Google Sign-In session cleared.');
    } catch (error: any) {
      // El error 'SIGN_IN_REQUIRED' es normal si el usuario no estaba logueado con Google.
      // Lo ignoramos para no detener el flujo de logout normal y continuamos.
      if (error.code !== 'SIGN_IN_REQUIRED') {
        console.error('AuthContext: Error during Google SignOut, continuing logout...', error);
      }
    }

    try {
      // Proceder a limpiar el estado de la aplicación y el almacenamiento local
      console.log('AuthContext: Clearing app-specific auth state...');
      await AsyncStorage.multiRemove(['accessToken', 'userRole', 'user']);
      console.log('AuthContext: AsyncStorage cleared.');

      setAuthToken(null); // Limpiamos el token de axios

      setAuthState({
        accessToken: null,
        authenticated: false,
        userRole: null,
        user: null,
      });
      console.log('AuthContext: authState set to unauthenticated.');
    } catch (e) {
      console.error('AuthContext: Failed to clear auth state from storage', e);
    }
  };

  // NUEVO: Función para actualizar los datos del usuario en el estado y AsyncStorage
  const updateUser = async (newUserData: Partial<User>) => {
    if (!authState.user) {
      console.error("AuthContext: No se puede actualizar, no hay un usuario logueado.");
      return;
    }
    try {
      const updatedUser = { ...authState.user, ...newUserData };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setAuthState(prevState => ({
        ...prevState,
        user: updatedUser as User,
      }));
      console.log('AuthContext: Datos del usuario actualizados correctamente.');
    } catch (e) {
      console.error('AuthContext: Falló al actualizar los datos del usuario', e);
    }
  };

  // El valor que provee el contexto a sus hijos
  const value = {
    authState,
    login,
    logout,
    updateUser, // Exponemos la nueva función
  };


  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook personalizado para usar el AuthContext fácilmente en otros componentes
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

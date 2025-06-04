// c:/Proyectos/AbejaNet/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Definimos la forma del estado de autenticación y las funciones que proveerá el contexto
interface AuthContextData {
  authState: { 
    accessToken: string | null;
    authenticated: boolean | null; // null mientras se verifica, luego true o false
    userRole: 'administrador' | 'user' | null; // Roles que manejes
  };
  login: (token: string, role: 'administrador' | 'user') => Promise<void>;
  logout: () => Promise<void>;
}

// Creamos el contexto con un valor inicial undefined, ya que se proveerá más adelante
const AuthContext = createContext<AuthContextData | undefined>(undefined);

// Creamos el componente Proveedor del Contexto
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthContextData['authState']>({
    accessToken: null,
    authenticated: null, // Inicia como null hasta que se verifique desde AsyncStorage
    userRole: null,
  });

  // useEffect para cargar el estado de autenticación desde AsyncStorage al iniciar la app
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        console.log('AuthContext: Attempting to load auth state...');
        const token = await AsyncStorage.getItem('accessToken');
        const role = await AsyncStorage.getItem('userRole') as 'administrador' | 'user' | null;
        console.log('AuthContext: Loaded from AsyncStorage - Token:', token, 'Role:', role);
        if (token && role) {
          setAuthState({
            accessToken: token,
            authenticated: true,
            userRole: role,
          });
          console.log('AuthContext: User is authenticated based on stored data.');
        } else {
          setAuthState({
            accessToken: null,
            authenticated: false,
            userRole: null,
          });
          console.log('AuthContext: No valid token/role found, user is not authenticated.');
        }
      } catch (e) {
        console.error('Failed to load auth state from storage', e);
        setAuthState({
          accessToken: null,
          authenticated: false,
          userRole: null,
        });
      }
    };
    loadAuthState();
  }, []);

  // Función para manejar el inicio de sesión
  const login = async (token: string, role: 'administrador' | 'user') => {
    try {
      await AsyncStorage.setItem('accessToken', token);
      await AsyncStorage.setItem('userRole', role);
      setAuthState({
        accessToken: token,
        authenticated: true,
        userRole: role,
      });
    } catch (e) {
      console.error('Failed to save auth state to storage', e);
      // Aquí podrías manejar el error, quizás mostrando un mensaje al usuario
    }
  };

  // Función para manejar el cierre de sesión
  const logout = async () => {
    console.log('AuthContext: logout initiated');
    try {
      console.log('AuthContext: Attempting to remove accessToken...');
      await AsyncStorage.removeItem('accessToken');
      console.log('AuthContext: accessToken removed.');

      console.log('AuthContext: Attempting to remove userRole...');
      await AsyncStorage.removeItem('userRole');
      console.log('AuthContext: userRole removed.');

      setAuthState({
        accessToken: null,
        authenticated: false,
        userRole: null,
      });
      console.log('AuthContext: authState set to unauthenticated.');
    } catch (e) {
      console.error('AuthContext: Failed to clear auth state from storage', e);
    }
  };

  // El valor que provee el contexto a sus hijos
  const value = {
    authState,
    login,
    logout,
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

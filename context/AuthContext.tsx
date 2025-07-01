// c:/Proyectos/AbejaNet/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [authState, setAuthState] = useState<AuthContextData['authState']>({
    accessToken: null,
    authenticated: null, // Inicia como null hasta que se verifique desde AsyncStorage
    userRole: null,
    user: null,
  });

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
          setAuthState({
            accessToken: token,
            authenticated: true,
            userRole: role,
            user: user,
          });
          console.log('AuthContext: User is authenticated based on stored data.');
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
  }, []);

  // Función para manejar el inicio de sesión
  const login = async (token: string, role: 'administrador' | 'usuario', user: User) => {
    try {
      await AsyncStorage.setItem('accessToken', token);
      await AsyncStorage.setItem('userRole', role);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      setAuthState({
        accessToken: token,
        authenticated: true,
        userRole: role,
        user: user,
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

      console.log('AuthContext: Attempting to remove user...');
      await AsyncStorage.removeItem('user');
      console.log('AuthContext: user removed.');

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

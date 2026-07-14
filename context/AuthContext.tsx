import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { registerForPushNotificationsAsync, savePushToken } from '../services/notificationService';
import api, { setAuthToken, setupErrorInterceptor } from '../utils/api';

interface User {
  id: number;
  nombre: string | null;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  correo_electronico: string;
}

interface AuthContextData {
  authState: { 
    accessToken: string | null;
    refreshToken: string | null;
    authenticated: boolean | null;
    userRole: 'administrador' | 'usuario' | null;
    user: User | null;
    hasSeenOnboarding: boolean | null;
  };
  login: (token: string, refreshToken: string, role: 'administrador' | 'usuario', user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (newUserData: Partial<User>) => Promise<void>;
  setHasSeenOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthContextData['authState']>({
    accessToken: null,
    refreshToken: null,
    authenticated: null,
    userRole: null,
    user: null,
    hasSeenOnboarding: null,
  });

  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutos (NIST SP 800-63B)

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (authState.authenticated) {
      inactivityTimerRef.current = setTimeout(() => {
        console.log('AuthContext: Inactividad detectada, cerrando sesión.');
        logout();
      }, INACTIVITY_TIMEOUT);
    }
  };

  useEffect(() => {
    if (authState.authenticated) {
      resetInactivityTimer();
    } else {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    }
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [authState.authenticated]);

  // Reset timer on any user interaction while authenticated
  useEffect(() => {
    if (!authState.authenticated) return;
    const interactionSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        resetInactivityTimer();
      }
    });
    return () => interactionSubscription.remove();
  }, [authState.authenticated]);

  const proveBiometrics = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    
    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'AbejaNet - Identidad Requerida',
        fallbackLabel: 'Usar PIN'
      });
      if (!result.success) {
        logout();
        return false;
      }
      return true;
    }
    return true;
  };

  const handleRefresh = async () => {
    try {
      const storedRefresh = await SecureStore.getItemAsync('refreshToken');
      if (!storedRefresh) throw new Error('No existe llava maestra localmente');
      
      const response = await api.post('/api/refresh-token', { refreshToken: storedRefresh });
      if (response.data.success) {
        const newToken = response.data.token;
        const newRefresh = response.data.refreshToken;
        
        await SecureStore.setItemAsync('accessToken', newToken);
        await SecureStore.setItemAsync('refreshToken', newRefresh);
        setAuthToken(newToken);
        
        setAuthState(prev => ({
          ...prev,
          accessToken: newToken,
          refreshToken: newRefresh
        }));
        return newToken;
      }
    } catch(e) {
      throw e;
    }
    return null;
  };

  useEffect(() => {
    const loadAuthState = async () => {
      try {
        console.log('AuthContext: Intentando Recuperación Segura desde SecureStore...');
        const token = await SecureStore.getItemAsync('accessToken');
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        
        const role = await AsyncStorage.getItem('userRole') as 'administrador' | 'usuario' | null;
        const userString = await AsyncStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        
        const onboardingString = await AsyncStorage.getItem('hasSeenOnboarding');
        const hasSeenOnboarding = onboardingString === 'true';
        
        if (token && refreshToken && role && user) {
          let activeToken = token;
          try {
            const decodedToken = jwtDecode<{ exp: number }>(token);
            if ((decodedToken.exp * 1000) <= Date.now()) {
               console.log('AuthContext: AccessToken Expirado Biológicamente. Activando Renobación Maestra en Hardware...');
               const renewed = await handleRefresh();
               if (!renewed) throw new Error('Refresh Fallido');
               activeToken = renewed;
            }
          } catch(e){
              throw new Error('Token irrecuperable de la Bóveda');
          }

          // Validación Biométrica Primaria al Descubrir Autenticación
          await proveBiometrics();

          setAuthToken(activeToken);
          setAuthState({
            accessToken: activeToken,
            refreshToken: await SecureStore.getItemAsync('refreshToken'),
            authenticated: true,
            userRole: role,
            user: user,
            hasSeenOnboarding,
          });

          const pushToken = await registerForPushNotificationsAsync();
          if (pushToken) await savePushToken(pushToken);
          
        } else {
          setAuthState(prev => ({ ...prev, authenticated: false, hasSeenOnboarding }));
        }
      } catch (e) {
        console.log('Sesión no recuperable de SecureStore, purgando bóveda...', e);
        logout();
      }
    };

    loadAuthState();
    setupErrorInterceptor(logout, handleRefresh);

  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && authState.authenticated) {
         try {
           const decodedToken = jwtDecode<{ exp: number }>(authState.accessToken || '');
           if ((decodedToken.exp * 1000) <= Date.now()) {
                console.log("App regresó del doze con token muerto. Resucitando vía maestría oscura.");
                await handleRefresh();
           }
         } catch(e) {}
         
         await proveBiometrics();
      }
    });
    return () => subscription.remove();
  }, [authState.authenticated, authState.accessToken]);

  const login = async (token: string, refreshToken: string, role: 'administrador' | 'usuario', user: User) => {
    try {
      await SecureStore.setItemAsync('accessToken', token);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
      await AsyncStorage.setItem('userRole', role);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      setAuthToken(token); 
      setAuthState(prev => ({
        ...prev,
        accessToken: token,
        refreshToken: refreshToken,
        authenticated: true,
        userRole: role,
        user: user,
      }));

      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken) await savePushToken(pushToken);

    } catch (e) {
      console.error('Bóveda Rechazó el Guardado Criptográfico', e);
    }
  };

  const logout = async () => {
    try {
      await GoogleSignin.signOut();
    } catch (e) {}

    try {
      await AsyncStorage.multiRemove(['userRole', 'user']);
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      setAuthToken(null);
      setAuthState(prev => ({
        ...prev,
        accessToken: null,
        refreshToken: null,
        authenticated: false,
        userRole: null,
        user: null,
      }));
    } catch (e) {}
  };

  const updateUser = async (newUserData: Partial<User>) => {
    if (!authState.user) return;
    try {
      const updatedUser = { ...authState.user, ...newUserData };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setAuthState(prevState => ({
        ...prevState,
        user: updatedUser as User,
      }));
    } catch (e) {}
  };

  const setHasSeenOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      setAuthState(prev => ({ ...prev, hasSeenOnboarding: true }));
    } catch (e) {}
  };

  const value = { authState, login, logout, updateUser, setHasSeenOnboarding };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

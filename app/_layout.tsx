// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import 'react-native-reanimated';

// Importar configuración de i18n para multi-idioma
import '../utils/i18n';

import { AnimatedSplash } from '@/components/AnimatedSplash';
import { toastConfig } from '@/components/ToastConfig';
import { ThemeProvider as AppThemeProvider } from '@/context/ThemeContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import * as Notifications from 'expo-notifications';
import Toast from 'react-native-toast-message';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { NotificationsProvider } from './context/NotificationsContext';

// Exporta el ErrorBoundary de Expo Router para manejar errores en rutas
export { ErrorBoundary } from 'expo-router';


// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Configura cómo se deben manejar las notificaciones cuando la app está en primer plano.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Mostrar la alerta (banner)
    shouldPlaySound: true, // Reproducir sonido
    shouldSetBadge: true,  // Actualizar el contador en el ícono de la app
  }),
});




// Componente principal del Layout que decide qué mostrar
function AppLayout() {
  const { authState } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [isSplashAnimationComplete, setSplashAnimationComplete] = useState(false);

  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    // Aquí puedes añadir más fuentes si las necesitas
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    // Condición 1: Dependencias críticas no listas (fuentes o estado de autenticación)
    if (!loaded || authState.authenticated === null) {
      // La SplashScreen nativa permanece visible porque hideAsync() no se ha llamado.
      return;
    }

    // Condición 2: Determinar si se necesita una redirección
    const inAuthGroup = segments[0] === '(auth)';
    let performRedirect = false;

    if (!authState.authenticated) {
      if (!authState.hasSeenOnboarding && segments[1] !== 'onboarding') {
        router.replace('/(auth)/onboarding');
        performRedirect = true;
      } else if (authState.hasSeenOnboarding && !inAuthGroup) {
        // Solo redirigimos a login si están en un área protegida
        router.replace('/(auth)/login');
        performRedirect = true;
      }
    } else if (authState.authenticated) {
      if (authState.userRole === 'administrador' && (inAuthGroup || segments[0] !== '(admin)')) {
        router.replace('/(admin)/adminDashboard');
        performRedirect = true;
      } else if (authState.userRole === 'usuario' && (inAuthGroup || segments[0] !== '(user)')) {
        router.replace('/(user)/dashboard');
        performRedirect = true;
      }
    }

    // Condición 3: Actuar basado en la necesidad de redirección
    if (performRedirect) {
      // Se inició una redirección. El efecto se volverá a ejecutar cuando cambien los segmentos.
      // La SplashScreen nativa permanece visible.
      return;
    }

    // Condición 4: No se necesitó redirección, el usuario está en la pantalla correcta.
    // Ahora es seguro ocultar la SplashScreen nativa.
    SplashScreen.hideAsync();

  }, [loaded, authState.authenticated, authState.userRole, segments, router]);

  // Efecto para manejar la interacción con notificaciones
  useEffect(() => {
    // Este listener se dispara cuando un usuario toca una notificación
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Usuario ha interactuado con la notificación:', response);
      // Por ahora, simplemente redirigimos a la pantalla de alertas.
      // En el futuro, podríamos usar `response.notification.request.content.data` para ir a una pantalla específica.
      router.push({ pathname: '/(user)/AlertsScreen' });
    });

    return () => subscription.remove();
  }, [router]);

  // Si las fuentes aún no están cargadas O el estado de autenticación aún se está determinando,
  // no renderizar la estructura principal de la app. El useEffect se encargará de la SplashScreen.
  if (!loaded || authState.authenticated === null) {
    return null;
  }

  // Una vez que las fuentes están cargadas, siempre renderizar la estructura del navegador.
  // El useEffect se encarga de la visibilidad del contenido mediante la SplashScreen y las redirecciones.
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {/* 
          Expo Router manejará automáticamente qué grupo de rutas mostrar 
          basado en la URL a la que se redirige.
        */}
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      {!isSplashAnimationComplete && (
        <AnimatedSplash onAnimationComplete={() => setSplashAnimationComplete(true)} />
      )}
      <Toast config={toastConfig} />
    </ThemeProvider>
  );
}

// El RootLayout ahora envuelve AppLayout con AuthProvider


export default function RootLayout() {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <NotificationsProvider>
          <AppLayout />
        </NotificationsProvider>
      </AuthProvider>
    </AppThemeProvider>
  );
}


// app/_layout.tsx
import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider, useAuth } from '../context/AuthContext'; // Importa el AuthProvider y useAuth

// Exporta el ErrorBoundary de Expo Router para manejar errores en rutas
export { ErrorBoundary } from 'expo-router';

import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'; // Añadir para SplashScreen

// Componente SplashScreen Básico
function SplashScreen() {
  const colorScheme = useColorScheme();
  return (
    <View style={[styles.splashContainer, { backgroundColor: colorScheme === 'dark' ? '#000' : '#fff' }]}>
      <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#fff' : '#1976d2'} />
      <Text style={[styles.splashText, { color: colorScheme === 'dark' ? '#fff' : '#1976d2' }]}>Cargando AbejaNet...</Text>
    </View>
  );
}

// Componente principal del Layout que decide qué mostrar
function AppLayout() {
  const { authState } = useAuth();
  const segments = useSegments(); // Obtiene los segmentos de la ruta actual (ej: ['(auth)', 'login'])
  const router = useRouter();
  const colorScheme = useColorScheme();

  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    // Aquí puedes añadir más fuentes si las necesitas
  });

  useEffect(() => {
    if (error) throw error; // Si hay error cargando fuentes, lanza el error
  }, [error]);

  // Log para ver el estado de autenticación y los segmentos cada vez que cambian
  useEffect(() => {
    console.log('_layout.tsx: AuthState changed:', JSON.stringify(authState));
    console.log('_layout.tsx: Segments changed:', segments);
  }, [authState, segments]);

  useEffect(() => {
    console.log(`_layout.tsx: useEffect for redirection triggered. Loaded: ${loaded}, Authenticated: ${authState.authenticated}, Role: ${authState.userRole}, Segments: ${JSON.stringify(segments)}`);

    if (!loaded || authState.authenticated === null) {
      console.log('_layout.tsx: Conditions not met for redirection logic (not loaded or auth state unknown). Returning.');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    console.log(`_layout.tsx: InAuthGroup: ${inAuthGroup}`);

    // Diagnostic logs for current effect cycle
    console.log(`_layout.tsx: EFFECT CYCLE CHECK - Authenticated: ${authState.authenticated}, Role: ${authState.userRole}, InAuthGroup: ${inAuthGroup}`);

    if (!authState.authenticated) { // Usuario NO está autenticado
      // Explicitly type segments.length to see if it helps TypeScript's inference
      console.log(`_layout.tsx: User NOT authenticated. InAuthGroup: ${inAuthGroup}, Segments: ${JSON.stringify(segments)}`);
      if (!inAuthGroup) { // If not already in an auth screen (e.g. login, register)
        console.log('_layout.tsx: Unauthenticated user NOT in auth group. Redirecting to /(auth)/login.');
        router.replace('/(auth)/login');
        return; // Importante después de redirigir
      } else {
        // User is not authenticated, but IS in the auth group. Let them stay.
        console.log('_layout.tsx: Unauthenticated user IS in auth group. No redirect needed by this rule.');
      }
    } else { // Usuario SÍ está autenticado
      console.log(`_layout.tsx: User IS authenticated. Role: ${authState.userRole}, Segments: ${JSON.stringify(segments)}, InAuthGroup: ${inAuthGroup}`);

      if (authState.userRole === 'administrador') {
        console.log('_layout.tsx: Authenticated user is Administrador.');
        // Si el admin está en el grupo (auth) (acaba de iniciar sesión) O si no está aún en su ruta del panel de admin
        if (inAuthGroup || segments[0] !== '(admin)') {
          console.log(`_layout.tsx: Admin (segments[0]=${segments[0]}, inAuthGroup=${inAuthGroup}). Redirecting to /(admin)/adminDashboard.`);
          router.replace('/(admin)/adminDashboard');
          return; // Importante
        } else {
          // Admin ya está en su grupo '(admin)' y no en '(auth)'.
          console.log(`_layout.tsx: Admin (segments[0]=${segments[0]}, inAuthGroup=${inAuthGroup}). No redirect needed by this rule.`);
        }
      } else if (authState.userRole === 'usuario') {
        console.log('_layout.tsx: Authenticated user is Usuario.');
        // Redirigir al usuario a su pantalla principal si:
        // 1. No está ya en su grupo de rutas '(user)'.
        // OR 2. Está en el grupo '(auth)' (ej. justo después de login).
        if (segments[0] !== '(user)' || inAuthGroup) {
          console.log(`_layout.tsx: Usuario (segments[0]=${segments[0]}, inAuthGroup=${inAuthGroup}). Redirecting to /(user)/dashboard.`);
          router.replace('/(user)/dashboard'); // Redirige al dashboard del grupo (user)
          return; // Importante
        } else {
          // Usuario ya está en su grupo '(user)' y no en '(auth)'.
          console.log(`_layout.tsx: Usuario (segments[0]=${segments[0]}, inAuthGroup=${inAuthGroup}). No redirect needed by this rule.`);
        }
      } else {
        // Usuario autenticado pero con un rol no manejado o nulo.
        console.log(`_layout.tsx: Authenticated user with unhandled role: ${authState.userRole}. No specific redirection rule triggered here.`);
        // Aquí podrías considerar un fallback, como redirigir a una pantalla de error,
        // a la pantalla de login, o ejecutar logout() si es un estado inválido.
        // Por ahora, solo se registra en consola.
      }
    }
    console.log('_layout.tsx: End of redirection logic for this cycle.');
  }, [loaded, authState.authenticated, authState.userRole, segments, router]);

  if (!loaded || authState.authenticated === null) {
    // Muestra un loader o null mientras las fuentes cargan o se verifica el estado de auth.
    // Podrías poner un SplashScreen aquí si lo deseas.
    return <SplashScreen />;
  }

  // Una vez cargado y con estado de auth definido, muestra el Stack principal
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* 
          Expo Router manejará automáticamente qué grupo de rutas mostrar 
          basado en la URL a la que se redirige.
          No necesitamos listar explícitamente '(auth)' o '(admin)' aquí 
          si no queremos configurar opciones específicas para el Stack de esos grupos.
          Si quisiéramos, podríamos hacer:
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(admin)" />
          Pero para empezar, dejarlo así es más simple.
        */}
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

// El RootLayout ahora envuelve AppLayout con AuthProvider
const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}


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

    // Lógica para admin autenticado
    if (authState.authenticated && authState.userRole === 'administrador') {
      console.log('_layout.tsx: Admin specific logic: Authenticated IS true AND Role IS administrador.');
      if (inAuthGroup) {
        console.log('_layout.tsx: Admin specific logic: ALSO inAuthGroup IS true. ATTEMPTING REDIRECT to /(admin).');
        router.replace('/(admin)');
        return; // Importante: salir después de redirigir
      } else {
        console.log('_layout.tsx: Admin specific logic: NOT inAuthGroup. No redirection to admin panel by this rule (e.g., already in admin).');
      }
    } 
    // Lógica para no autenticado
    else if (!authState.authenticated && !inAuthGroup && segments.length > 0) {
      console.log('_layout.tsx: User not authenticated AND not in auth group. Redirecting to /(auth)/login');
      router.replace('/(auth)/login');
      return; // Importante
    } 
    // Lógica para no autenticado pero ya en grupo auth (o segmentos vacíos)
    else if (!authState.authenticated && (inAuthGroup || segments.length === 0)) {
      console.log('_layout.tsx: User not authenticated but already in auth group, or segments empty. No redirection to login needed by this rule.');
    } else {
      console.log('_layout.tsx: Fallback or other condition met. No specific redirection rule triggered here.');
    }
    // Nota: Si tienes roles de 'user', aquí añadirías lógica para redirigir a '/(user)' o similar.
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


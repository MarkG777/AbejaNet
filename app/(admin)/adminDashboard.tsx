import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { getApiUrl } from '../../utils/ip_config';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, StyleSheet } from 'react-native'; // Import StyleSheet
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

interface AdminProfile {
  id: number;
  rol: string;
}

export default function AdminDashboardScreen() { // Renamed component for clarity
  const { email } = useLocalSearchParams<{ email: string }>();
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [profileData, setProfileData] = useState<AdminProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    const initializeScreen = async () => { // Renamed function for clarity
      try {
        const baseUrl = await getApiUrl();
        setApiBaseUrl(baseUrl);

        // Fetch admin profile data
        setLoadingProfile(true);
        setProfileError(null);
        const token = await AsyncStorage.getItem('accessToken');
        console.log('AdminDashboardScreen Fetch: Using token:', token);

        if (!token) {
          setProfileError('No se encontró token. Inicie sesión.');
          setLoadingProfile(false);
          return;
        }

        const response = await fetch(`${baseUrl}/api/admin/perfil`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          setProfileError(
            `Error ${response.status}: ${errorData.message || 'No se pudo obtener el perfil.'}`
          );
          setLoadingProfile(false);
          return;
        }

        const data = await response.json();
        if (data.success && data.perfil) {
          setProfileData(data.perfil);
        } else {
          setProfileError(data.message || 'Respuesta inesperada del servidor.');
        }
      } catch (e: any) {
        console.error('Error en AdminDashboardScreen:', e);
        setProfileError(`Error de conexión: ${e.message}`);
      } finally {
        setLoadingProfile(false);
      }
    };

    initializeScreen();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>
        Panel de Administrador
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        Bienvenido, <ThemedText style={{ fontWeight: 'bold' }}>{email || 'Admin'}</ThemedText>
      </ThemedText>
      <ThemedText style={styles.apiInfo}>
        API Conectada: {apiBaseUrl || 'Cargando...'}
      </ThemedText>

      {loadingProfile && (
        <ActivityIndicator size="large" color="#1976d2" style={{ marginVertical: 20 }} />
      )}

      {profileError && (
        <ThemedView style={styles.infoBoxError}>
          <ThemedText style={{ fontWeight: 'bold', color: '#D32F2F' }}>Error al cargar perfil:</ThemedText>
          <ThemedText style={{ color: '#D32F2F' }}>{profileError}</ThemedText>
        </ThemedView>
      )}

      {profileData && !loadingProfile && (
        <ThemedView style={styles.infoBoxSuccess}>
          <ThemedText style={{ fontWeight: 'bold', color: '#388E3C' }}>Perfil (API Protegida):</ThemedText>
          <ThemedText>ID Usuario: {profileData.id}</ThemedText>
          <ThemedText>Rol: {profileData.rol}</ThemedText>
        </ThemedView>
      )}
      </ThemedView>
    </SafeAreaView>
  );
}

// Add basic styles if they are not imported from elsewhere or define them here
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f0f0', // Match container background or make it transparent
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f0f0f0', // Example background color
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  apiInfo: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    color: 'grey',
  },
  infoBoxError: {
    backgroundColor: '#FFEBEE', // Light red
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D32F2F', // Darker red
  },
  infoBoxSuccess: {
    backgroundColor: '#E8F5E9', // Light green
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#388E3C', // Darker green
  },
  // Add other styles used by ThemedText/ThemedView if necessary
});

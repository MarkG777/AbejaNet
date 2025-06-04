import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { getApiUrl } from '../../utils/ip_config';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, StyleSheet } from 'react-native'; // Import StyleSheet

interface AdminProfile {
  id: number;
  rol: string;
}

export default function WelcomeScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [profileData, setProfileData] = useState<AdminProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    const 초기화 = async () => {
      try {
        const baseUrl = await getApiUrl();
        setApiBaseUrl(baseUrl);

        // Fetch admin profile data
        setLoadingProfile(true);
        setProfileError(null);
        const token = await AsyncStorage.getItem('accessToken');
        console.log('AdminProfile Fetch: Using token:', token);

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
        console.error('Error en WelcomeScreen:', e);
        setProfileError(`Error de conexión: ${e.message}`);
      } finally {
        setLoadingProfile(false);
      }
    };

    초기화();
  }, []);

  return (
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

      <ThemedText style={styles.instructions}>
        Utiliza el menú lateral para navegar por las opciones de administración.
      </ThemedText>
    </ThemedView>
  );
}

// Add StyleSheet for better organization
const styles = StyleSheet.create({
  container: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#f0f4f8' // Softer background color
  },
  title: {
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#1976d2', 
    marginBottom: 10
  },
  subtitle: {
    fontSize: 18, 
    marginBottom: 5, 
    color: '#333'
  },
  apiInfo: {
    fontSize: 12, 
    color: '#777', 
    marginBottom: 20
  },
  infoBoxSuccess: {
    marginVertical: 15,
    padding: 15,
    backgroundColor: '#E8F5E9', // Light green background
    borderRadius: 8,
    width: '90%',
    alignItems: 'center',
    borderLeftWidth: 5,
    borderLeftColor: '#4CAF50'
  },
  infoBoxError: {
    marginVertical: 15,
    padding: 15,
    backgroundColor: '#FFEBEE', // Light red background
    borderRadius: 8,
    width: '90%',
    alignItems: 'center',
    borderLeftWidth: 5,
    borderLeftColor: '#F44336'
  },
  instructions: {
    fontSize: 16, 
    textAlign: 'center', 
    color: '#555',
    marginTop: 20
  }
});



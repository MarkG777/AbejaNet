import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { getApiUrl } from '../../utils/ip_config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/hooks/useAppColors';

interface AdminProfile {
  id: number;
  rol: string;
}

export default function AdminDashboardScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const colors = useAppColors();
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [profileData, setProfileData] = useState<AdminProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    const initializeScreen = async () => {
      try {
        const baseUrl = await getApiUrl();
        setApiBaseUrl(baseUrl);

        setLoadingProfile(true);
        setProfileError(null);
        const token = await AsyncStorage.getItem('accessToken');

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          Panel de Administrador
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Bienvenido, <Text style={{ fontWeight: 'bold' }}>{email || 'Admin'}</Text>
        </Text>
        <Text style={[styles.apiInfo, { color: colors.textTertiary }]}>
          API Conectada: {apiBaseUrl || 'Cargando...'}
        </Text>

        {loadingProfile && (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
        )}

        {profileError && (
          <View style={[styles.infoBoxError, { backgroundColor: colors.background, borderColor: colors.danger }]}>
            <Text style={{ fontWeight: 'bold', color: colors.danger }}>Error al cargar perfil:</Text>
            <Text style={{ color: colors.danger }}>{profileError}</Text>
          </View>
        )}

        {profileData && !loadingProfile && (
          <View style={[styles.infoBoxSuccess, { backgroundColor: colors.background, borderColor: colors.success }]}>
            <Text style={{ fontWeight: 'bold', color: colors.success }}>Perfil (API Protegida):</Text>
            <Text style={{ color: colors.text }}>ID Usuario: {profileData.id}</Text>
            <Text style={{ color: colors.text }}>Rol: {profileData.rol}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
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
  },
  infoBoxError: {
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
  },
  infoBoxSuccess: {
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
  },
});

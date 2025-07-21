import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { isAxiosError } from 'axios';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '../../utils/ip_config';

interface Alerta {
  id: number;
  colmena_id: number;
  tipo_alerta: string;
  valor_registrado: string;
  mensaje: string;
  leida: boolean;
  fecha_alerta: string;
  nombre_colmena: string;
  nombre_apiario: string;
}

const AlertsScreen = () => {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { authState } = useAuth();
  const router = useRouter();

  const fetchAlertas = useCallback(async () => {
    if (!authState?.accessToken) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const response = await api.get<Alerta[]>('/api/alertas');
      setAlertas(response.data);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      if (isAxiosError(err) && err.response) {
        setError(`Error: ${err.response.data.message || 'No se pudieron cargar las alertas.'}`);
      } else {
        setError('No se pudieron cargar las alertas. Revisa tu conexión.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authState.accessToken]);



  useFocusEffect(
    useCallback(() => {
      const markAlertsAsRead = async () => {
        try {
          const apiUrl = await getApiUrl();
          const token = await AsyncStorage.getItem('token');
          if (!token) return;

          await fetch(`${apiUrl}/api/alertas/marcar-como-leidas`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          console.log('Alertas marcadas como leídas.');
        } catch (error) {
          console.error('Error al marcar alertas como leídas:', error);
        }
      };

      // Primero marcamos como leídas, luego cargamos la lista actualizada.
      markAlertsAsRead().then(() => {
        fetchAlertas();
      });

    }, []) // El array de dependencias vacío asegura que se ejecute solo una vez por foco.
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAlertas();
  }, [fetchAlertas]);

  const getAlertIcon = (tipo: string): { name: keyof typeof Ionicons.glyphMap; color: string } => {
    const lowerCaseTipo = tipo.toLowerCase();

    if (lowerCaseTipo.includes('temperatura_alta')) {
      return { name: 'thermometer-outline', color: '#FF3B30' };
    }
    if (lowerCaseTipo.includes('perdida_de_peso')) {
      return { name: 'trending-down-outline', color: '#FF9500' };
    }
    if (lowerCaseTipo.includes('humedad_baja')) {
      return { name: 'water-outline', color: '#5AC8FA' };
    }
    if (lowerCaseTipo.includes('humedad_alta')) {
      return { name: 'cloudy-night-outline', color: '#007AFF' };
    }
    if (lowerCaseTipo.includes('posible_enjambrazon')) {
      return { name: 'pulse-outline', color: '#AF52DE' };
    }
    return { name: 'alert-circle-outline', color: '#8A8A8E' };
  };

  const renderItem = ({ item }: { item: Alerta }) => {
    const icon = getAlertIcon(item.tipo_alerta);
    return (
      <View style={[styles.alertCard, item.leida ? styles.alertRead : {}]}>
        <Ionicons name={icon.name} size={28} color={icon.color} style={styles.icon} />
        <View style={styles.alertContent}>
          <Text style={styles.alertTitle}>{item.tipo_alerta.replace(/_/g, ' ')}</Text>
          <Text style={styles.alertMessage}>{item.mensaje}</Text>
          <Text style={styles.alertDetails}>
            {item.nombre_apiario} / {item.nombre_colmena}
          </Text>
          <Text style={styles.alertDate}>
            {format(new Date(item.fecha_alerta), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
          </Text>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    if (loading && !refreshing) {
      return <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />;
    }

    if (error) {
      return (
        <View style={styles.centeredMessageContainer}>
          <Ionicons name="cloud-offline-outline" size={60} color="#8A8A8E" />
          <Text style={styles.messageText}>Ocurrió un error</Text>
          <Text style={styles.subMessageText}>{error}</Text>
          <TouchableOpacity onPress={fetchAlertas} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (alertas.length === 0) {
      return (
        <View style={styles.centeredMessageContainer}>
          <Ionicons name="shield-checkmark-outline" size={60} color="#4CAF50" />
          <Text style={styles.messageText}>¡Todo en orden!</Text>
          <Text style={styles.subMessageText}>No hay alertas que mostrar.</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={alertas}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007AFF"]} tintColor="#007AFF"/>}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Historial de Alertas',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ),
        }}
      />
      {renderContent()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f7',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 5,
    borderLeftColor: '#FFA500',
  },
  alertRead: {
    borderLeftColor: '#4CAF50',
    backgroundColor: '#f9f9f9',
  },
  icon: {
    marginRight: 16,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textTransform: 'capitalize',
  },
  alertMessage: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
  alertDetails: {
    fontSize: 12,
    color: '#777',
    marginTop: 8,
  },
  alertDate: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },
  centeredMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messageText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  subMessageText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AlertsScreen;

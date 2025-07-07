import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { getApiUrl } from '@/utils/ip_config';
import axios from 'axios';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FontAwesome5 } from '@expo/vector-icons';
import { Stack } from 'expo-router';

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
  const { authState } = useAuth();

  const fetchAlertas = useCallback(async () => {
    if (!authState?.accessToken) {
      setLoading(false);
      return;
    }
    try {
      const apiUrl = await getApiUrl();
      const response = await axios.get(`${apiUrl}/api/alertas`, {
        headers: { Authorization: `Bearer ${authState.accessToken}` },
      });
      setAlertas(response.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authState.accessToken]);

  useEffect(() => {
    fetchAlertas();
  }, [fetchAlertas]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAlertas();
  }, [fetchAlertas]);

  const getAlertIcon = (type: string) => {
    if (type.includes('TEMPERATURA')) return { name: 'thermometer-full', color: '#FF6347' };
    if (type.includes('PESO')) return { name: 'weight-hanging', color: '#4682B4' };
    if (type.includes('SONIDO')) return { name: 'volume-up', color: '#FFD700' };
    return { name: 'exclamation-triangle', color: '#FFA500' };
  };

  const renderItem = ({ item }: { item: Alerta }) => {
    const icon = getAlertIcon(item.tipo_alerta);
    return (
      <View style={[styles.alertCard, item.leida ? styles.alertRead : {}]}>
        <FontAwesome5 name={icon.name} size={24} color={icon.color} style={styles.icon} />
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

  if (loading) {
    return <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Historial de Alertas' }} />
      <View style={styles.container}>
        {alertas.length === 0 ? (
          <View style={styles.noAlertsContainer}>
            <FontAwesome5 name="check-circle" size={60} color="#4CAF50" />
            <Text style={styles.noAlertsText}>¡Todo en orden!</Text>
            <Text style={styles.noAlertsSubText}>No hay alertas que mostrar.</Text>
          </View>
        ) : (
          <FlatList
            data={alertas}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007AFF"]} tintColor="#007AFF"/>}
          />
        )}
      </View>
    </>
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
  noAlertsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noAlertsText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  noAlertsSubText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default AlertsScreen;

import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { isAxiosError } from 'axios';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '@/hooks/useAppColors';
import { SkeletonLoader } from '@/components/SkeletonLoader';

// Definimos el tipo para una alerta individual
interface Alerta {
  id: number;
  colmena_id: number;
  tipo_alerta: string;
  valor_registrado: string;
  mensaje: string;
  fecha_alerta: string;
  leida: boolean;
  colmena_nombre?: string;
  apiario_nombre?: string;
}

const AlertsScreen = () => {
  const router = useRouter();
  const colors = useAppColors();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlertas = useCallback(async () => {
    if (!refreshing) {
      setLoading(true);
    }
    try {
      const response = await api.get('/api/alertas');
      if (response.data.success) {
        setAlertas(response.data.alertas);
        setError(null);

      } else {
        throw new Error(response.data.message || 'Error desconocido al obtener alertas');
      }
    } catch (err: any) {
      console.error('Error en fetchAlertas:', err);
      setError(err.message || 'No se pudieron cargar las alertas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    fetchAlertas();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAlertas();
      return () => {
        api.post('/api/alertas/marcar-como-leidas').catch(err => console.error('Error marcando alertas leídas', err));
      };
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAlertas();
  }, []);

  const getAlertIcon = (tipo: string): { name: keyof typeof Ionicons.glyphMap; color: string } => {
    switch (tipo) {
      case 'TEMPERATURA_ALTA':
      case 'TEMPERATURA_BAJA':
        return { name: 'thermometer-outline', color: '#FF6347' };
      case 'HUMEDAD_ALTA':
      case 'HUMEDAD_BAJA':
        return { name: 'water-outline', color: '#1E90FF' };
      case 'MOVIMIENTO_BRUSCO':
        return { name: 'move-outline', color: '#FFD700' };
      case 'BATERIA_BAJA':
        return { name: 'battery-half-outline', color: '#F44336' };
      case 'PERDIDA_CONEXION':
        return { name: 'cloud-offline-outline', color: '#A9A9A9' };
      case 'PESO_ANOMALO':
        return { name: 'analytics-outline', color: '#9C27B0' };
      default:
        return { name: 'alert-circle-outline', color: '#8A8A8E' };
    }
  };

  const renderItem = ({ item }: { item: Alerta }) => {
    const icon = getAlertIcon(item.tipo_alerta);
    return (
      <View style={[
        styles.alertCard,
        { backgroundColor: colors.alertCardBg, borderColor: colors.alertReadBorder },
        !item.leida && { backgroundColor: colors.alertUnreadBg, borderColor: colors.alertUnreadBorder }
      ]}>
        <Ionicons name={icon.name} size={28} color={icon.color} style={styles.icon} />
        <View style={styles.alertContent}>
          <Text style={[styles.alertTitle, { color: colors.text }]}>{item.tipo_alerta.replace(/_/g, ' ')}</Text>
          <Text style={[styles.alertMessage, { color: colors.textSecondary }]}>{item.mensaje}</Text>
          <Text style={[styles.alertDetails, { color: colors.textTertiary }]}>
            {item.apiario_nombre} / {item.colmena_nombre}
          </Text>
          <Text style={[styles.alertDate, { color: colors.textTertiary }]}>
            {format(new Date(item.fecha_alerta), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
          </Text>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    if (loading && !refreshing) {
      return <ActivityIndicator size="large" color={colors.accent} style={styles.centeredMessageContainer} />;
    }

    if (error) {
      return (
        <View style={[styles.centeredMessageContainer, { backgroundColor: colors.background }]}>
          <Ionicons name="cloud-offline-outline" size={60} color={colors.textTertiary} />
          <Text style={[styles.messageText, { color: colors.text }]}>Ocurrió un error</Text>
          <Text style={[styles.subMessageText, { color: colors.textTertiary }]}>{error}</Text>
          <TouchableOpacity onPress={() => fetchAlertas()} style={[styles.retryButton, { backgroundColor: colors.accent }]}>
            <Text style={[styles.retryButtonText, { color: colors.text }]}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (alertas.length === 0) {
      return (
        <View style={[styles.centeredMessageContainer, { backgroundColor: colors.background }]}>
          <Ionicons name="shield-checkmark-outline" size={60} color={colors.success} />
          <Text style={[styles.messageText, { color: colors.text }]}>¡Todo en orden!</Text>
          <Text style={[styles.subMessageText, { color: colors.textTertiary }]}>No hay alertas que mostrar.</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={alertas}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} tintColor={colors.accent}/>}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Historial de Alertas',
          headerStyle: { backgroundColor: colors.headerBackground },
          headerTintColor: colors.headerText,
          headerTitleStyle: { fontWeight: 'bold' },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
              <Ionicons name="arrow-back" size={24} color={colors.headerText} />
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
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    flexGrow: 1,
  },
  alertCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 5,
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
    textTransform: 'capitalize',
  },
  alertMessage: {
    fontSize: 14,
    marginTop: 4,
  },
  alertDetails: {
    fontSize: 12,
    marginTop: 8,
  },
  alertDate: {
    fontSize: 12,
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
    marginTop: 16,
  },
  subMessageText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AlertsScreen;

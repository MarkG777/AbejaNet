import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { isAxiosError } from 'axios';
import { useAppColors } from '@/hooks/useAppColors';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { useTranslation } from 'react-i18next';

// Define la estructura de un objeto Apiario
interface Apiario {
  id: number;
  nombre: string;
  descripcion_general: string;
  direccion_o_coordenadas: string;
  fecha_creacion: string;
}

// Componente para renderizar cada tarjeta de Apiario
const ApiarioCard: React.FC<{ item: Apiario; colors: any }> = ({ item, colors }) => {
  const handlePress = () => {
    router.push({ 
      pathname: `/(user)/ApiarioDetailScreen`, 
      params: { apiarioId: item.id, apiarioNombre: item.nombre }
    });
  };

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.card }]} onPress={handlePress}>
      <View style={[styles.cardIconContainer, { backgroundColor: colors.borderLight }]}>
        <Ionicons name="business-outline" size={32} color={colors.accent} />
      </View>
      <View style={styles.cardTextContainer}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{item.nombre}</Text>
        <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>{item.descripcion_general}</Text>
      </View>
      <Ionicons name="chevron-forward-outline" size={24} color={colors.textTertiary} />
    </TouchableOpacity>
  );
};

// Pantalla principal que muestra la lista de Apiarios
export default function ColmenasScreen() {
  const colors = useAppColors();
  const { t } = useTranslation();
  const handleBack = () => router.back();
  const { authState } = useAuth();
  const [apiarios, setApiarios] = useState<Apiario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchApiarios = async () => {
    setError(null);
    try {
      const response = await api.get<{ apiarios: Apiario[] }>('/api/apiarios');
      setApiarios(response.data.apiarios);
    } catch (err) {
      console.error("Error fetching apiarios:", err);
      if (isAxiosError(err) && err.response) {
        setError(err.response.data.message || t('error_loading', 'No se pudieron cargar los apiarios.'));
      } else {
        setError(t('error_network', 'Ocurrió un error inesperado. Revisa tu conexión.'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchApiarios();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchApiarios();
  }, []);

  if (loading) {
    return (
      <View style={[{ flex: 1, padding: 20 }, { backgroundColor: colors.background }]}>
        {[1, 2, 3, 4].map((i) => (
          <SkeletonLoader key={i} width="100%" height={100} borderRadius={16} style={{ marginBottom: 16 }} />
        ))}
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centeredContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>Error: {error}</Text>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={onRefresh}>
                <Text style={styles.buttonText}>{t('retry', 'Reintentar')}</Text>
            </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: t('my_apiaries', 'Mis Apiarios'),
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={{ marginLeft: 10 }}>
              <Ionicons name="arrow-back" size={24} color={colors.headerText} />
            </TouchableOpacity>
          ),
        }}
      />
      <FlatList
        data={apiarios}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <ApiarioCard item={item} colors={colors} />}
        ListEmptyComponent={() => (
          <View style={styles.centeredContainer}>
            <Ionicons name="information-circle-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('no_apiaries', 'No tienes apiarios asignados.')}</Text>
            <Text style={[styles.emptySubText, { color: colors.textTertiary }]}>{t('contact_admin', 'Contacta a administrador para obtener acceso.')}</Text>
          </View>
        )}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} tintColor={colors.accent} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptySubText: {
    marginTop: 5,
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardIconContainer: {
    borderRadius: 50,
    padding: 12,
    marginRight: 15,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 14,
  },
});

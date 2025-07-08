import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext'; // Importar el hook de autenticación

import api from '../../utils/api';
import { isAxiosError } from 'axios';

// Define la estructura de un objeto Apiario (debe coincidir con lo que envía el backend)
interface Apiario {
  id: number;
  nombre: string;
  descripcion_general: string;
  direccion_o_coordenadas: string;
  fecha_creacion: string;
}

// Componente para renderizar cada tarjeta de Apiario
const ApiarioCard: React.FC<{ item: Apiario }> = ({ item }) => {
  // Función para manejar el clic en una tarjeta
  const handlePress = () => {
    // Navegamos a una futura pantalla de detalles del apiario
    // pasando el id y el nombre como parámetros.
    router.push({ 
      pathname: `/(user)/ApiarioDetailScreen`, 
      params: { apiarioId: item.id, apiarioNombre: item.nombre }
    });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <View style={styles.cardIconContainer}>
        <Ionicons name="business-outline" size={32} color="#8A652D" />
      </View>
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardTitle}>{item.nombre}</Text>
        <Text style={styles.cardDescription} numberOfLines={2}>{item.descripcion_general}</Text>
      </View>
      <Ionicons name="chevron-forward-outline" size={24} color="#C7C7CC" />
    </TouchableOpacity>
  );
};

// Pantalla principal que muestra la lista de Apiarios
export default function ColmenasScreen() {
  const handleBack = () => router.back();
  const { authState } = useAuth(); // Usar el contexto para obtener el estado de autenticación
  const [apiarios, setApiarios] = useState<Apiario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchApiarios = async () => {
    setError(null); // Limpiamos errores previos
    try {
      // Nuestro 'api' se encarga del token y la URL base.
      const response = await api.get<{ apiarios: Apiario[] }>('/api/apiarios');
      setApiarios(response.data.apiarios);
    } catch (err) {
      // El interceptor se encarga del logout. Aquí solo mostramos el error.
      console.error("Error fetching apiarios:", err);
      if (isAxiosError(err) && err.response) {
        setError(err.response.data.message || 'No se pudieron cargar los apiarios.');
      } else {
        setError('Ocurrió un error inesperado. Revisa tu conexión.');
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
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text style={styles.loadingText}>Cargando tus apiarios...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text style={styles.errorText}>Error: {error}</Text>
            <TouchableOpacity style={styles.button} onPress={onRefresh}>
                <Text style={styles.buttonText}>Reintentar</Text>
            </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.header}>Mis Apiarios</Text>
      </View>
      <FlatList
        data={apiarios}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <ApiarioCard item={item} />}
        ListEmptyComponent={() => (
          <View style={styles.centeredContainer}>
            <Ionicons name="information-circle-outline" size={48} color="#888" />
            <Text style={styles.emptyText}>No tienes apiarios asignados.</Text>
            <Text style={styles.emptySubText}>Contacta a un administrador para obtener acceso.</Text>
          </View>
        )}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#F59E0B"]} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F4',
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
    color: '#666',
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    marginTop: 15,
    backgroundColor: '#F59E0B',
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
    color: '#555',
  },
  emptySubText: {
    marginTop: 5,
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    paddingRight: 15,
    zIndex: 1,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#F5EEDC',
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
    color: '#333',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
  },
});

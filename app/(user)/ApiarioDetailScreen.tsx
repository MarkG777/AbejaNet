import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // Importar iconos
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { isAxiosError } from 'axios';

// Definimos un tipo para las colmenas para mayor seguridad de código
type Colmena = {
  id: number;
  nombre: string;
};

export default function ApiarioDetailScreen() {
  const { apiarioId, apiarioNombre } = useLocalSearchParams();
  const { authState } = useAuth();
  const router = useRouter();

  const [colmenas, setColmenas] = useState<Colmena[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchColmenas = async () => {
      if (!apiarioId) return;
      setError(null);

      try {
        // Usamos nuestro cliente 'api' que ya maneja la URL base y el token.
        const response = await api.get<{ colmenas: Colmena[] }>(`/api/apiarios/${apiarioId}/colmenas`);
        setColmenas(response.data.colmenas);
      } catch (err) {
        console.error('Error fetching colmenas:', err);
        // El interceptor se encarga del logout. Aquí solo mostramos el error.
        if (isAxiosError(err) && err.response) {
          setError(err.response.data.message || 'No se pudieron cargar las colmenas.');
        } else {
          setError('Ocurrió un error inesperado.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchColmenas();
  }, [apiarioId]);

  const handleColmenaPress = (colmena: Colmena) => {
    router.push({
      pathname: '/(user)/ColmenaDetailScreen',
      params: {
        colmenaId: colmena.id,
        colmenaNombre: colmena.nombre,
        apiarioId: apiarioId, // Pasamos el ID del apiario actual
        apiarioNombre: apiarioNombre, // Pasamos el nombre del apiario actual
      },
    });
  };

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="large" color="#F5A623" style={{ marginTop: 20 }} />;
    }

    if (error) {
      return <Text style={styles.errorText}>Error: {error}</Text>;
    }

    if (colmenas.length === 0) {
      return <Text style={styles.textPlaceholder}>No hay colmenas en este apiario.</Text>;
    }

    return (
      <FlatList
        data={colmenas}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.colmenaItem} onPress={() => handleColmenaPress(item)}>
            <Text style={styles.colmenaText}>{item.nombre}</Text>
            <Ionicons name="chevron-forward" size={24} color="#888" />
          </TouchableOpacity>
        )}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.push('/(user)/ColmenasScreen')} style={{ marginLeft: 10 }}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          ),
          title: String(apiarioNombre) || 'Apiario',
        }}
      />

      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFF',
  },

  list: {
    width: '100%',
  },
  colmenaItem: {
    backgroundColor: '#F8F8F8',
    padding: 20,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: '#F5A623',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  colmenaText: {
    fontSize: 18,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
  textPlaceholder: {
    fontSize: 16,
    color: '#888',
    marginTop: 30,
    textAlign: 'center',
  },
});

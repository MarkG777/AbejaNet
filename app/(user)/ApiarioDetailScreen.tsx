import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // Importar iconos
import { useAuth } from '../../context/AuthContext';
import { getApiUrl } from '../../utils/ip_config';

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

      try {
        const apiUrl = await getApiUrl();
        const token = authState?.accessToken;
        if (!token) throw new Error('No autenticado');

        const response = await fetch(`${apiUrl}/api/apiarios/${apiarioId}/colmenas`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Error al cargar las colmenas');
        }

        setColmenas(data.colmenas);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchColmenas();
  }, [apiarioId]);

  const handleColmenaPress = (colmena: Colmena) => {
    router.push({ 
      pathname: '/(user)/ColmenaDetailScreen', 
      params: { colmenaId: colmena.id, colmenaNombre: colmena.nombre } 
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
      <TouchableOpacity onPress={() => router.push('/(user)/ColmenasScreen')} style={styles.backButton}>
        <Ionicons name="arrow-back" size={22} color="#007AFF" />
        <Text style={styles.backButtonText}>Volver a Mis Apiarios</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{String(apiarioNombre) || 'Detalle del Apiario'}</Text>
      <Text style={styles.subtitle}>Colmenas</Text>
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonText: {
    marginLeft: 6,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#555',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 10,
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

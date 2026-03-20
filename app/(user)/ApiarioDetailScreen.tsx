import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { isAxiosError } from 'axios';
import { useAppColors } from '@/hooks/useAppColors';
import { SkeletonLoader } from '@/components/SkeletonLoader';

// Definimos un tipo para las colmenas para mayor seguridad de código
type Colmena = {
  id: number;
  nombre: string;
};

export default function ApiarioDetailScreen() {
  const { apiarioId, apiarioNombre } = useLocalSearchParams();
  const { authState } = useAuth();
  const router = useRouter();
  const colors = useAppColors();

  const [colmenas, setColmenas] = useState<Colmena[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchColmenas = async () => {
      if (!apiarioId) return;
      setError(null);

      try {
        const response = await api.get<{ colmenas: Colmena[] }>(`/api/apiarios/${apiarioId}/colmenas`);
        setColmenas(response.data.colmenas);
      } catch (err) {
        console.error('Error fetching colmenas:', err);
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
        apiarioId: apiarioId,
        apiarioNombre: apiarioNombre,
      },
    });
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={{ padding: 20 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonLoader key={i} width="100%" height={60} borderRadius={12} style={{ marginBottom: 12 }} />
          ))}
        </View>
      );
    }

    if (error) {
      return <Text style={[styles.errorText, { color: colors.danger }]}>Error: {error}</Text>;
    }

    if (colmenas.length === 0) {
      return <Text style={[styles.textPlaceholder, { color: colors.textTertiary }]}>No hay colmenas en este apiario.</Text>;
    }

    return (
      <FlatList
        data={colmenas}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.colmenaItem, { backgroundColor: colors.card }]} onPress={() => handleColmenaPress(item)}>
            <Text style={[styles.colmenaText, { color: colors.text }]}>{item.nombre}</Text>
            <Ionicons name="chevron-forward" size={24} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.push('/(user)/ColmenasScreen')} style={{ marginLeft: 10 }}>
              <Ionicons name="arrow-back" size={24} color={colors.headerText} />
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
  },
  list: {
    width: '100%',
  },
  colmenaItem: {
    padding: 20,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: '#F5A623',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  colmenaText: {
    fontSize: 18,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  textPlaceholder: {
    fontSize: 16,
    marginTop: 30,
    textAlign: 'center',
  },
});

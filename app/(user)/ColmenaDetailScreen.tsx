import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

// Placeholder for a chart component
const PlaceholderChart = ({ title }: { title: string }) => (
  <View style={styles.chartContainer}>
    <Text style={styles.chartTitle}>{title}</Text>
    <View style={styles.chartPlaceholder}>
      <Text style={styles.chartPlaceholderText}>Gráfica de {title.toLowerCase()} (próximamente)</Text>
    </View>
  </View>
);

export default function ColmenaDetailScreen() {
  const { colmenaId, colmenaNombre } = useLocalSearchParams();

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{String(colmenaNombre) || 'Detalle de Colmena'}</Text>
      <Text style={styles.subtitle}>ID de Colmena: {String(colmenaId)}</Text>
      
      <PlaceholderChart title="Temperatura" />
      <PlaceholderChart title="Humedad" />
      <PlaceholderChart title="Peso" />
      <PlaceholderChart title="Sonido" />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
  chartContainer: {
    marginBottom: 25,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#444',
    marginBottom: 10,
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chartPlaceholderText: {
    color: '#888',
    fontSize: 16,
  },
});

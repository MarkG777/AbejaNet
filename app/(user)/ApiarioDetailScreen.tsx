import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function ApiarioDetailScreen() {
  const { apiarioId, apiarioNombre } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Detalles del Apiario</Text>
      <Text style={styles.text}>ID: {apiarioId}</Text>
      <Text style={styles.text}>Nombre: {apiarioNombre}</Text>
      <Text style={styles.textPlaceholder}>Próximamente: aquí se mostrarán las colmenas de este apiario.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  text: {
    fontSize: 18,
    marginBottom: 10,
  },
  textPlaceholder: {
      fontSize: 16,
      color: '#888',
      marginTop: 30,
      textAlign: 'center',
  }
});

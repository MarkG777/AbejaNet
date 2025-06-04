// app/(admin)/sensores.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

export default function SensoresScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Gestión de Sensores</ThemedText>
      <ThemedText>Aquí podrás administrar los sensores de tus colmenas.</ThemedText>
      {/* Contenido futuro de la pantalla de sensores */}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

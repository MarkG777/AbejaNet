// app/(admin)/colmenas.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

export default function ColmenasScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Gestión de Colmenas</ThemedText>
      <ThemedText>Aquí podrás administrar tus colmenas.</ThemedText>
      {/* Contenido futuro de la pantalla de colmenas */}
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

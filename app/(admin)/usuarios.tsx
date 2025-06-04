// app/(admin)/usuarios.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

export default function UsuariosScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Gestión de Usuarios</ThemedText>
      <ThemedText>Aquí podrás administrar los usuarios del sistema.</ThemedText>
      {/* Contenido futuro de la pantalla de usuarios */}
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

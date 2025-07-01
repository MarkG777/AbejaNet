import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';

const UserDashboardScreen = () => {
  const { authState } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="sunny-outline" size={80} color="#FFC107" />
        <Text style={styles.title}>¡Bienvenido a AbejaNet!</Text>
        <Text style={styles.subtitle}>
          Hola, {authState.user?.nombre || 'apicultor'}. Estamos contentos de verte.
        </Text>
        <Text style={styles.instructions}>
          Usa el menú lateral para navegar por tus apiarios y revisar tus colmenas.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  instructions: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default UserDashboardScreen;

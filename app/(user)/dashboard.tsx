import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext'; // Ajusta la ruta si es necesario

const UserDashboardScreen = () => {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    // El _layout.tsx se encargará de la redirección al login
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={styles.safeArea.backgroundColor} />
      <View style={styles.container}>
        <Text style={styles.title}>Bienvenido</Text>
        <Text style={styles.subtitle}>¿Qué te gustaría hacer hoy?</Text>

        <TouchableOpacity 
          style={[styles.optionButton, styles.profileButton]}
          onPress={() => router.push('/(user)/profile')} // Ruta para el perfil (a crear)
        >
          <Ionicons name="person-circle-outline" size={28} color="#ffffff" />
          <Text style={styles.optionButtonText}>Mi Perfil</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.optionButton, styles.colmenasButton]}
          onPress={() => router.push('/(user)/ColmenasScreen')}
        >
          <Ionicons name="archive-outline" size={28} color="#ffffff" />
          <Text style={styles.optionButtonText}>Revisar Colmenas</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={22} color="#ffffff" />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f4f7', // Un color de fondo suave
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#7f8c8d',
    marginBottom: 40,
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginBottom: 20,
    width: '90%',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  profileButton: {
    backgroundColor: '#1976d2', // Azul del header
  },
  colmenasButton: {
    backgroundColor: '#F59E0B', // anaranjado
  },
  optionButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 15,
  },
  logoutButton: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    backgroundColor: '#e74c3c', // Rojo para logout
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.20,
    shadowRadius: 1.41,
    elevation: 2,
  },
});

export default UserDashboardScreen;

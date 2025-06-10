import { Ionicons } from '@expo/vector-icons';
import { Drawer } from 'expo-router/drawer';
import React from 'react';
import { Alert, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext'; // Ajusta la ruta si es necesario

export default function AdminDrawerLayout() {
  const { signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, Cerrar Sesión', onPress: () => signOut(), style: 'destructive' },
      ],
      { cancelable: true }
    );
  };

  return (
    <Drawer
      screenOptions={{
        headerShown: true, // Muestra el header para el botón de menú
        drawerActiveTintColor: '#007AFF', // Color del ítem activo
        drawerInactiveTintColor: '#333333', // Color del ítem inactivo
        drawerLabelStyle: { marginLeft: -20, fontSize: 15 },
        // Ocultar header si es web para evitar doble header si el navegador ya lo tiene
        ...(Platform.OS === 'web' && { headerShown: false }), 
      }}>
      <Drawer.Screen
        name="adminDashboard" // Debe coincidir con el nombre de tu archivo (adminDashboard.tsx)
        options={{
          title: 'Panel de Administrador',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="cog-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Puedes añadir más pantallas del admin aquí si las tienes */}
      {/* Ejemplo:
      <Drawer.Screen
        name="manageUsers"
        options={{
          title: 'Gestionar Usuarios',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      */}
      <Drawer.Screen
        name="logout"
        options={{
          title: 'Cerrar Sesión',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="log-out-outline" size={size} color={color} />
          ),
        }}
        listeners={{
          drawerItemPress: (e) => {
            e.preventDefault(); // Previene la navegación a una pantalla 'logout'
            handleLogout();
          },
        }}
      />
    </Drawer>
  );
}

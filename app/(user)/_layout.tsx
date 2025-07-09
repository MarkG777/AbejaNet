import { Ionicons } from '@expo/vector-icons';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';

// Contenido personalizado para el menú desplegable del usuario
function CustomDrawerContent(props: any) {
  const { logout } = useAuth();

  const handleLogout = async () => {
    // Log de diagnóstico para confirmar si esta función se llama por error
    console.log(`--- LOGOUT TRIGGERED AT ${new Date().toISOString()} ---`);
    await logout();
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1, flexDirection: 'column' }}>
      {/* Contenedor del Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/images/abejanet.png')}
          style={styles.logo}
        />
      </View>
      
      {/* Items del Menú */}
      <DrawerItemList {...props} />

      {/* Este es el truco: un View vacío que ocupa todo el espacio restante empuja el logout al fondo */}
      <View style={{ flex: 1 }} />

      {/* Contenedor del Botón de Logout */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={22} color="#d32f2f" />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

// Layout principal del usuario usando Drawer
export default function UserLayout() {
  const router = useRouter();

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1976d2',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        drawerActiveTintColor: '#1976d2',
        drawerInactiveTintColor: '#333',
        drawerLabelStyle: {
          fontSize: 15,
        },
      }}
    >
      <Drawer.Screen
        name="dashboard"
        options={{
          title: 'Bienvenido',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="ColmenasScreen"
        options={{
          title: 'Mis Apiarios',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="archive-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="profile" // Esto buscará el archivo app/(user)/profile.tsx
        options={{
          title: 'Mi Perfil',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="AlertsScreen"
        options={{
          title: 'Historial de Alertas',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="ApiarioDetailScreen"
        options={{
          title: 'Detalle del Apiario',
          drawerItemStyle: { display: 'none' }, // Oculta esta pantalla del menú lateral
        }}
      />
      <Drawer.Screen
        name="ColmenaDetailScreen"
        options={({ route }) => ({
          title: 'Detalle de la Colmena',
          drawerItemStyle: { display: 'none' },
          headerLeft: () => {
            const params = route.params as { apiarioId: string; apiarioNombre: string };
            return (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/(user)/ApiarioDetailScreen',
                    params: {
                      apiarioId: params.apiarioId,
                      apiarioNombre: params.apiarioNombre,
                    },
                  })
                }
                style={{ paddingHorizontal: 15 }}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
            );
          },
        })}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  logoutContainer: {
    paddingVertical: 10,
    paddingBottom: 20, // Un poco más de espacio abajo
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    zIndex: 1, // Evita la superposición del área de touch
  },
  logoutText: {
    marginLeft: 15,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
});

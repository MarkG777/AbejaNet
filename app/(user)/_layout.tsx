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
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/images/abejanet.png')}
          style={styles.logo}
        />
      </View>
      <DrawerItemList {...props} />
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
          title: 'Revisar Colmenas',
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
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  logoutText: {
    marginLeft: 15,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
});

// app/(admin)/_layout.js
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native'; // Added Image
import { Drawer } from 'expo-router/drawer'; // Importa Drawer de Expo Router
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer'; // DrawerItem para acciones personalizadas
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext'; // Ajusta la ruta si es necesario
import { useRouter } from 'expo-router';
// Ya no importamos WelcomeScreen aquí, Expo Router lo encontrará por la ruta de archivo.

// Componente para personalizar el contenido del Drawer (ej. añadir cabecera y botón de logout)
function CustomDrawerContent(props) {
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <DrawerContentScrollView {...props} style={{ backgroundColor: '#f0f0f0' }}>
      <View style={styles.drawerHeader}>
        {/* Asegúrate de que la ruta a tu logo sea correcta */}
        <Image 
          source={require('../../assets/images/abejanet.png')} 
          style={styles.drawerLogo} 
          resizeMode="contain" 
        />
      </View>
      <DrawerItemList {...props} />
      {/* Ejemplo de un botón de Cerrar Sesión */}
      <DrawerItem
        label="Cerrar Sesión"
        icon={({ color, size }) => <Ionicons name="log-out-outline" size={size} color={color} />}
        onPress={async () => {
          console.log('Cerrar Sesión presionado - Invocando logout');
          await logout();
          console.log('Logout completado, redirigiendo a login...');
          router.replace('/(auth)/login'); // Redirige a la pantalla de login
        }}
        labelStyle={{ fontWeight: 'bold', color: '#d32f2f' }}
        style={{ marginTop: 20 }} // Un poco de espacio arriba
      />
    </DrawerContentScrollView>
  );
}

// Este es el layout para el grupo (admin)
export default function AdminLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: '#1976d2' },
        headerTintColor: '#fff',
        drawerActiveTintColor: '#1976d2',
        drawerInactiveTintColor: '#555',
        drawerLabelStyle: { fontSize: 16, marginLeft: 0 }, // Ajustado para evitar superposición (antes -20)
        drawerStyle: { backgroundColor: '#f0f0f0', width: 280 },
      }}
    >
      {/* 
        Cada Drawer.Screen aquí define una opción en el menú lateral.
        El atributo 'name' DEBE coincidir con el nombre del archivo (sin extensión)
        o el nombre de la carpeta dentro de 'app/(admin)/' que contiene la pantalla.
        Por ejemplo, name="index" se mapea a app/(admin)/index.tsx.
        name="colmenas" se mapea a app/(admin)/colmenas.tsx (o app/(admin)/colmenas/index.tsx).
      */}
      <Drawer.Screen
        name="index" // Mapea a app/(admin)/index.tsx
        options={{
          drawerLabel: 'Inicio',
          title: 'Panel de Administrador', // Título en la cabecera de la pantalla
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="colmenas" // Mapea a app/(admin)/colmenas.tsx (debes crear este archivo)
        options={{
          drawerLabel: 'Colmenas',
          title: 'Gestión de Colmenas',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="leaf-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="sensores" // Mapea a app/(admin)/sensores.tsx (debes crear este archivo)
        options={{
          drawerLabel: 'Sensores',
          title: 'Gestión de Sensores',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="speedometer-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="usuarios" // Mapea a app/(admin)/usuarios.tsx (debes crear este archivo)
        options={{
          drawerLabel: 'Usuarios',
          title: 'Gestión de Usuarios',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Puedes añadir más pantallas aquí. Asegúrate de que el 'name' corresponda
          a un archivo o carpeta dentro de app/(admin)/ */}
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#e0e0e0',
    marginBottom: 10,
  },
  drawerHeaderText: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  drawerLogo: {
    width: 180, // Ajusta el ancho según tu logo
    height: 60, // Ajusta la altura según tu logo
    marginBottom: 10, // Espacio opcional debajo del logo
  },
});


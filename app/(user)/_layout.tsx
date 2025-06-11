import { Stack } from 'expo-router';
import React from 'react';

export default function UserStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1976d2', // Un color azul para el header
        },
        headerTintColor: '#fff', // Texto del header en blanco
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="dashboard" 
        options={{ 
          title: 'Bienvenido' 
        }} 
      />
      <Stack.Screen 
        name="ColmenasScreen" 
        options={{ 
          title: 'Mis Colmenas' 
        }} 
      />
      {/* Cuando crees la pantalla de perfil, puedes añadirla aquí.
      <Stack.Screen 
        name="profile" 
        options={{ 
          title: 'Mi Perfil' 
        }} 
      /> 
      */}
    </Stack>
  );
}

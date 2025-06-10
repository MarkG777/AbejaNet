import React from 'react';

import { View, Text, StyleSheet, FlatList, SafeAreaView, StatusBar, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Define la estructura de un objeto Colmena
interface Colmena {
  id: string; 
  nombre_identificativo: string;
  ubicacion_descripcion: string;
  fecha_establecimiento: string; 
  tipo_colmena: string; 
  estado_salud: 'saludable' | 'enferma' | 'debil' | 'desconocido';
  notas_adicionales?: string;
}

// Datos estáticos de ejemplo (simulando lo que vendría de la API)
const colmenasData: Colmena[] = [
  {
    id: 'COL001',
    nombre_identificativo: 'Alfa-01',
    ubicacion_descripcion: 'Sector Norte, Fila 3, Árbol de Manzano',
    fecha_establecimiento: '2023-04-15',
    tipo_colmena: 'Langstroth',
    estado_salud: 'saludable',
    notas_adicionales: 'Reina marcada en azul (2023). Producción alta el último ciclo.',
  },
  {
    id: 'COL002',
    nombre_identificativo: 'Beta-07',
    ubicacion_descripcion: 'Sector Este, Cerca del Arroyo',
    fecha_establecimiento: '2022-07-20',
    tipo_colmena: 'Dadant',
    estado_salud: 'debil',
    notas_adicionales: 'Población baja, revisar alimentación y posible enfermedad.',
  },
  {
    id: 'COL003',
    nombre_identificativo: 'Gamma-03',
    ubicacion_descripcion: 'Sector Oeste, Junto al Girasolero',
    fecha_establecimiento: '2024-01-10',
    tipo_colmena: 'Langstroth',
    estado_salud: 'saludable',
  },
  {
    id: 'COL004',
    nombre_identificativo: 'Delta-05',
    ubicacion_descripcion: 'Sector Sur, Protegida del Viento',
    fecha_establecimiento: '2023-09-01',
    tipo_colmena: 'Top Bar',
    estado_salud: 'enferma',
    notas_adicionales: 'Detectada Varroa, tratamiento aplicado el 2024-05-20.',
  },
];

const ColmenaCard: React.FC<{ item: Colmena; onPress: () => void }> = ({ item, onPress }) => {
  const getStatusColor = (status: Colmena['estado_salud']) => {
    switch (status) {
      case 'saludable': return '#4CAF50'; // Verde
      case 'debil': return '#FFC107'; // Ámbar
      case 'enferma': return '#F44336'; // Rojo
      default: return '#9E9E9E'; // Gris
    }
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="archive-outline" size={24} color="#3F51B5" />
        <Text style={styles.cardTitle}>{item.nombre_identificativo}</Text>
      </View>
      <Text style={styles.cardText}><Text style={styles.bold}>ID:</Text> {item.id}</Text>
      <Text style={styles.cardText}><Text style={styles.bold}>Ubicación:</Text> {item.ubicacion_descripcion}</Text>
      <Text style={styles.cardText}><Text style={styles.bold}>Establecida:</Text> {item.fecha_establecimiento}</Text>
      <Text style={styles.cardText}><Text style={styles.bold}>Tipo:</Text> {item.tipo_colmena}</Text>
      <View style={styles.statusContainer}>
        <Text style={styles.bold}>Salud:</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.estado_salud) }]} />
        <Text style={[styles.statusText, { color: getStatusColor(item.estado_salud) }]}>
          {item.estado_salud.charAt(0).toUpperCase() + item.estado_salud.slice(1)}
        </Text>
      </View>
      {item.notas_adicionales && (
        <Text style={styles.cardText}><Text style={styles.bold}>Notas:</Text> {item.notas_adicionales}</Text>
      )}
    </TouchableOpacity>
  );
};

const ColmenasScreen: React.FC = () => {
  const handleCardPress = (colmena: Colmena) => {
    // Aquí puedes navegar a una pantalla de detalle de la colmena o mostrar un modal
    console.log('Colmena seleccionada:', colmena.nombre_identificativo);
    // Ejemplo: router.push(`/(user)/colmena/${colmena.id}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={styles.safeArea.backgroundColor} />
      <View style={styles.container}>
        <Text style={styles.title}>Mis Colmenas</Text>
        <FlatList
          data={colmenasData}
          renderItem={({ item }) => <ColmenaCard item={item} onPress={() => handleCardPress(item)} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContentContainer}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6f8', 
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2c3e50', 
    marginBottom: 24,
    textAlign: 'center',
  },
  listContentContainer: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34495e',
    marginLeft: 10,
  },
  cardText: {
    fontSize: 14,
    color: '#555555',
    marginBottom: 5,
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold',
    color: '#333333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ColmenasScreen;

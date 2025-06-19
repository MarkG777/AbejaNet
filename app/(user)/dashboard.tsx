import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, Platform, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';

// --- Definición de Tipos ---
type HiveStatus = 'ok' | 'warning' | 'danger';

interface Hive {
  id: string;
  name: string;
  production: number;
  temp: number;
  humidity: number;
  status: HiveStatus;
}

interface ProgressBarProps {
  progress: number;
  color: string;
}

interface HiveStatusCardProps {
  item: Hive;
}

// --- Datos de ejemplo (ahora con tipos) ---
const hiveData: Hive[] = [
  { id: '1', name: 'Colmena A-01', production: 75, temp: 34.5, humidity: 60, status: 'ok' },
  { id: '2', name: 'Colmena A-02', production: 50, temp: 32.1, humidity: 65, status: 'warning' },
  { id: '3', name: 'Colmena B-01', production: 90, temp: 35.0, humidity: 58, status: 'ok' },
  { id: '4', name: 'Colmena C-01', production: 20, temp: 38.2, humidity: 50, status: 'danger' },
];

// --- Componente para la barra de progreso ---
const ProgressBar: React.FC<ProgressBarProps> = ({ progress, color }) => (
  <View style={styles.progressBarContainer}>
    <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: color }]} />
  </View>
);

// --- Componente para la tarjeta de estado de la colmena ---
const HiveStatusCard: React.FC<HiveStatusCardProps> = ({ item }) => {
  const statusInfo: Record<HiveStatus, { color: string; icon: keyof typeof Ionicons.glyphMap; text: string }> = {
    ok: { color: '#2ecc71', icon: 'checkmark-circle', text: 'Saludable' },
    warning: { color: '#f39c12', icon: 'warning', text: 'Revisar' },
    danger: { color: '#e74c3c', icon: 'close-circle', text: 'Alerta' },
  };

  const currentStatus = statusInfo[item.status];

  return (
    <View style={styles.card}>
      {/* Cabecera de la tarjeta */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: currentStatus.color }]}>
          <Ionicons name={currentStatus.icon} size={16} color="#fff" />
          <Text style={styles.statusText}>{currentStatus.text}</Text>
        </View>
      </View>

      {/* Cuerpo de la tarjeta */}
      <View style={styles.cardBody}>
        <Text style={styles.productionLabel}>Nivel de Producción</Text>
        <ProgressBar progress={item.production} color={currentStatus.color} />
        <Text style={styles.productionValue}>{item.production}%</Text>
      </View>

      {/* Pie de la tarjeta */}
      <View style={styles.cardFooter}>
        <View style={styles.footerMetric}>
          <Ionicons name="thermometer-outline" size={20} color="#3498db" />
          <Text style={styles.footerText}>{item.temp}°C</Text>
        </View>
        <View style={styles.footerMetric}>
          <Ionicons name="water-outline" size={20} color="#3498db" />
          <Text style={styles.footerText}>{item.humidity}%</Text>
        </View>
      </View>
    </View>
  );
};

// --- Pantalla principal del Dashboard ---
const UserDashboardScreen = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <FlatList<Hive>
        data={hiveData}
        renderItem={({ item }) => <HiveStatusCard item={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={() => (
          <Text style={styles.mainTitle}>Resumen del Apiario</Text>
        )}
      />
    </SafeAreaView>
  );
};

// --- Estilos ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0f4f7' },
  listContainer: { padding: 20, paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0) + 20 },
  mainTitle: { fontSize: 32, fontWeight: 'bold', color: '#2c3e50', marginBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#34495e' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12 },
  statusText: { color: '#fff', fontWeight: 'bold', marginLeft: 5, fontSize: 12 },
  cardBody: { alignItems: 'center', marginVertical: 10 },
  productionLabel: { fontSize: 14, color: '#7f8c8d', marginBottom: 8 },
  productionValue: { fontSize: 16, fontWeight: '600', color: '#34495e', marginTop: 8 },
  progressBarContainer: { height: 10, width: '100%', backgroundColor: '#ecf0f1', borderRadius: 5, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 5 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#ecf0f1', paddingTop: 15, marginTop: 15 },
  footerMetric: { flexDirection: 'row', alignItems: 'center' },
  footerText: { marginLeft: 8, fontSize: 16, color: '#2c3e50' },
});

export default UserDashboardScreen;

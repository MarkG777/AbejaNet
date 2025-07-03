import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { format, subDays, subWeeks, subMonths, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getApiUrl } from '../../utils/ip_config';

// Tipos de datos
interface Lectura {
  fecha_registro: string;
  temperatura: number | null;
  humedad: number | null;
  peso: number | null;
  sonido: number | null;
  lluvia: number | null;
}

type TimeRange = 'day' | 'week' | 'month';

// Tipos para las props de la gráfica
interface SensorChartProps {
  title: string;
  data: Lectura[];
  dataKey: keyof Omit<Lectura, 'fecha_registro' | 'lluvia'>;
  color: string;
  unit: string;
}

// Componente de Gráfica Reutilizable
const SensorChart = ({ title, data, dataKey, color, unit, timeRange }: SensorChartProps & { timeRange: TimeRange }) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View style={styles.chartPlaceholder}>
          <Text style={styles.chartPlaceholderText}>No hay datos disponibles.</Text>
        </View>
      </View>
    );
  }

  const chartData = {
    labels: data.map(d => {
      const date = parseISO(d.fecha_registro);
      if (timeRange === 'day') {
        // Con 12 puntos de datos (promedio cada 2h), podemos mostrar todas las etiquetas.
        return format(date, 'HH:mm');
      }
      if (timeRange === 'week') {
        return format(date, 'eee', { locale: es });
      }
      return format(date, 'dd/MM');
    }),
    datasets: [
      {
        data: data.map(d => d[dataKey] || 0),
        color: (opacity = 1) => color || `rgba(134, 65, 244, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: [`${title} (${unit})`],
  };

  return (
    <View style={styles.chartContainer}>
      <LineChart
        data={chartData}
        width={Dimensions.get('window').width - 32}
        height={220}
        yAxisLabel=""
        yAxisSuffix={` ${unit}`}
        chartConfig={chartConfig}
        bezier
        style={styles.chartStyle}
        // Rota las etiquetas del eje Y y mantiene horizontales las del eje X
        verticalLabelRotation={30}
        horizontalLabelRotation={0}
      />
    </View>
  );
};

// Configuración visual de las gráficas
const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.5,
  useShadowColorFromDataset: false,
  decimalPlaces: 1,
};

// Pantalla Principal
export default function ColmenaDetailScreen() {
  const { colmenaId, colmenaNombre } = useLocalSearchParams();
  const { authState: { accessToken: token } } = useAuth();

  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('day');

  useEffect(() => {
    const fetchLecturas = async () => {
      if (!token || !colmenaId) return;
      try {
        setLoading(true);
        const apiUrl = await getApiUrl();
        const response = await axios.get(`${apiUrl}/api/colmenas/${colmenaId}/lecturas`, {
          params: { range: timeRange },
          headers: { Authorization: `Bearer ${token}` },
        });
        const rawLecturas = response.data.lecturas || [];
        const processedLecturas = rawLecturas.map((l: Lectura) => ({
          ...l,
          // La librería de base de datos devuelve los decimales como strings. Los convertimos a números.
          temperatura: l.temperatura !== null && l.temperatura !== undefined ? parseFloat(l.temperatura as unknown as string) : null,
          humedad: l.humedad !== null && l.humedad !== undefined ? parseFloat(l.humedad as unknown as string) : null,
          peso: l.peso !== null && l.peso !== undefined ? parseFloat(l.peso as unknown as string) : null,
          sonido: l.sonido !== null && l.sonido !== undefined ? parseFloat(l.sonido as unknown as string) : null,
        }));
        setLecturas(processedLecturas);
        setError(null);
      } catch (e) {
        console.error('Error al obtener lecturas:', e);
        setError('No se pudieron cargar los datos de los sensores.');
      } finally {
        setLoading(false);
      }
    };
    fetchLecturas();
  }, [colmenaId, token, timeRange]);

  // La lógica de filtrado ahora está en el backend, por lo que usamos las lecturas directamente.
  const filteredLecturas = lecturas;

  const ultimaLectura = useMemo(() => lecturas[lecturas.length - 1], [lecturas]);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#FFC107" /></View>;
  }

  if (error) {
    return <View style={styles.centered}><Text style={styles.errorText}>{error}</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{String(colmenaNombre) || 'Detalle de Colmena'}</Text>
      
      {/* Resumen de Última Lectura */}
      {ultimaLectura && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Última Lectura</Text>
          <Text style={styles.summaryDate}>({format(parseISO(ultimaLectura.fecha_registro), "dd MMM, HH:mm'h'", { locale: es })})</Text>
          <View style={styles.summaryGrid}>
            <Text style={styles.summaryItem}>🌡️ {ultimaLectura.temperatura?.toFixed(1) ?? 'N/A'} °C</Text>
            <Text style={styles.summaryItem}>💧 {ultimaLectura.humedad?.toFixed(1) ?? 'N/A'} %</Text>
            <Text style={styles.summaryItem}>⚖️ {ultimaLectura.peso?.toFixed(1) ?? 'N/A'} kg</Text>
            <Text style={styles.summaryItem}>🔊 {ultimaLectura.sonido?.toFixed(1) ?? 'N/A'} dB</Text>
          </View>
        </View>
      )}

      {/* Selector de Rango de Tiempo */}
      <View style={styles.timeRangeSelector}>
        {(['day', 'week', 'month'] as TimeRange[]).map(range => (
          <TouchableOpacity
            key={range}
            style={[styles.timeRangeButton, timeRange === range && styles.timeRangeButtonActive]}
            onPress={() => setTimeRange(range)}
          >
            <Text style={[styles.timeRangeText, timeRange === range && styles.timeRangeTextActive]}>
              {range === 'day' ? 'Día' : range === 'week' ? 'Semana' : 'Mes'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Gráficas */}
      <SensorChart title="Temperatura" data={filteredLecturas} dataKey="temperatura" color="rgba(255, 99, 132, 1)" unit="°C" timeRange={timeRange} />
      <SensorChart title="Humedad" data={filteredLecturas} dataKey="humedad" color="rgba(54, 162, 235, 1)" unit="%" timeRange={timeRange} />
      <SensorChart title="Peso" data={filteredLecturas} dataKey="peso" color="rgba(75, 192, 192, 1)" unit="kg" timeRange={timeRange} />
      <SensorChart title="Sonido" data={filteredLecturas} dataKey="sonido" color="rgba(153, 102, 255, 1)" unit="dB" timeRange={timeRange} />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#343A40',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#343A40',
    textAlign: 'center',
  },
  summaryDate: {
    textAlign: 'center',
    color: '#6C757D',
    fontSize: 12,
    marginBottom: 10,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  summaryItem: {
    fontSize: 15,
    color: '#495057',
    width: '45%',
    marginVertical: 5,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#E9ECEF',
    borderRadius: 20,
    marginHorizontal: 20,
    marginVertical: 20,
    padding: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 16,
  },
  timeRangeButtonActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  timeRangeText: {
    textAlign: 'center',
    fontWeight: '600',
    color: '#6C757D',
  },
  timeRangeTextActive: {
    color: '#0D6EFD',
  },
  chartContainer: {
    marginBottom: 15,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#444',
    marginBottom: 10,
  },
  chartPlaceholder: {
    height: 220,
    width: Dimensions.get('window').width - 40,
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chartPlaceholderText: {
    color: '#888',
    fontSize: 16,
  },
  chartStyle: {
    borderRadius: 16,
  },
});

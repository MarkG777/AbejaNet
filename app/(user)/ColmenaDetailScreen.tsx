import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { isAxiosError } from 'axios';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { LineChartData } from 'react-native-chart-kit/dist/line-chart/LineChart';
import ComparisonChartModal from '../components/ComparisonChartModal';

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
type SensorDataKey = keyof Omit<Lectura, 'fecha_registro' | 'lluvia'>;

interface SensorChartProps {
  title: string;
  data: Lectura[];
  dataKey: SensorDataKey;
  color: string;
  unit: string;
  timeRange: TimeRange;
}

// --- CONSTANTES GLOBALES ---

const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
  },
};

const allChartProps: Omit<SensorChartProps, 'data' | 'timeRange'>[] = [
  { title: "Temperatura", dataKey: "temperatura", color: "rgba(255, 99, 132, 1)", unit: "°C" },
  { title: "Humedad", dataKey: "humedad", color: "rgba(54, 162, 235, 1)", unit: "%" },
  { title: "Peso", dataKey: "peso", color: "rgba(75, 192, 192, 1)", unit: "kg" },
  { title: "Sonido", dataKey: "sonido", color: "rgba(153, 102, 255, 1)", unit: "dB" }
];

// --- COMPONENTES REUTILIZABLES ---

const SensorChart = ({ title, data, dataKey, color, unit, timeRange }: SensorChartProps) => {
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

  // Ajustar decimales dinámicamente: para peso usamos 2 decimales para apreciar variaciones pequeñas
  const localChartConfig = { ...chartConfig, decimalPlaces: dataKey === 'peso' ? 2 : 1 } as typeof chartConfig;

  // Configuración específica por métrica para mostrar decimales en eje Y
  const customConfig = { ...chartConfig, decimalPlaces: dataKey === 'peso' ? 1 : chartConfig.decimalPlaces };
  const formatYLabel = (val: string) => {
    const num = parseFloat(val);
    return dataKey === 'peso' ? num.toFixed(1) : num.toFixed(1);
  };

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

// Tipos para las props de la gráfica de comparación
interface ComparisonChartProps {
  lecturas: Lectura[];
  timeRange: TimeRange;
  selectedChart: Omit<SensorChartProps, 'data' | 'timeRange'>;
  comparisonKey: SensorDataKey | null;
}

// Componente optimizado para la gráfica de comparación en el modal
const MemoizedComparisonChart = React.memo(({ lecturas, timeRange, selectedChart, comparisonKey }: ComparisonChartProps) => {
  const chartData = useMemo((): LineChartData => {
    const labels = lecturas.map((l: Lectura) => {
      const date = parseISO(l.fecha_registro);
      if (timeRange === 'day') return format(date, 'HH:mm');
      if (timeRange === 'week') return format(date, 'eee', { locale: es });
      return format(date, 'dd/MM');
    });

    const calculatePercentageChange = (dataKey: SensorDataKey): number[] => {
      const validData = lecturas.map(l => l[dataKey]).filter(v => v !== null) as number[];
      if (validData.length < 2) {
        return lecturas.map(() => 0);
      }
      const baseline = validData[0];
      if (baseline === 0) {
        return lecturas.map(() => 0); // Evitar división por cero
      }

      let lastValidValue = baseline;
      return lecturas.map(l => {
        const currentValue = l[dataKey];
        if (currentValue === null || currentValue === undefined) {
          // Para huecos en los datos, mantenemos el último cambio porcentual válido
          return ((lastValidValue - baseline) / baseline) * 100;
        }
        lastValidValue = currentValue;
        return ((currentValue - baseline) / baseline) * 100;
      });
    };

    const datasets = [];
    const legend = [];

    // Dataset principal
    datasets.push({
      data: calculatePercentageChange(selectedChart.dataKey),
      color: (opacity = 1) => selectedChart.color.replace(/1\)$/, `${opacity})`),
      strokeWidth: 2,
    });
    legend.push(`${selectedChart.title} (% Var)`);

    // Dataset de comparación
    if (comparisonKey) {
      const comparisonChart = allChartProps.find((p) => p.dataKey === comparisonKey);
      if (comparisonChart) {
        datasets.push({
          data: calculatePercentageChange(comparisonKey),
          color: (opacity = 1) => comparisonChart.color.replace(/1\)$/, `${opacity})`),
          strokeWidth: 2,
        });
        legend.push(`${comparisonChart.title} (% Var)`);
      }
    }

    return { labels, datasets, legend };
  }, [lecturas, timeRange, selectedChart, comparisonKey]);

  if (chartData.labels.length === 0) {
    return <Text style={styles.infoText}>No hay datos para mostrar en este rango.</Text>;
  }

  return (
    <LineChart
      data={chartData}
      width={Dimensions.get('window').width - 40}
      height={250}
      chartConfig={chartConfig}
      bezier
      style={styles.chartStyle}
      yAxisSuffix=" %"
      fromZero
      horizontalLabelRotation={0}
      verticalLabelRotation={30}
    />
  );
});

// Pantalla Principal
export default function ColmenaDetailScreen() {
  const { colmenaId, nombre } = useLocalSearchParams<{ colmenaId: string; nombre: string }>();
  const { authState } = useAuth();
  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('day');

  // Estado para el modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedChart, setSelectedChart] = useState<Omit<SensorChartProps, 'data' | 'timeRange'> | null>(null);
  // Estado para la métrica de comparación (ya no se muestra en UI pero lo usa lógica interna)
  const [comparisonKey, setComparisonKey] = useState<SensorDataKey | null>(null);
  

  const handleChartPress = (chartProps: Omit<SensorChartProps, 'data' | 'timeRange'>) => {
    setSelectedChart(chartProps);
    setComparisonKey(null); // Reiniciamos la comparación al abrir
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setComparisonKey(null); // Reiniciamos la comparación al cerrar
  };

  useEffect(() => {
    const fetchLecturas = async () => {
      if (!colmenaId) return;
      setLoading(true);
      setError(null);

      try {
        // Usamos nuestro cliente 'api' que ya maneja la URL, el token y los parámetros.
        const response = await api.get<{ lecturas: Lectura[] }>(`/api/colmenas/${colmenaId}/lecturas`, {
          params: { range: timeRange },
        });

        if (response.data && response.data.lecturas) {
          const processedLecturas = response.data.lecturas.map((l: any) => ({
            ...l,
            temperatura: l.temperatura !== null ? parseFloat(l.temperatura) : null,
            humedad: l.humedad !== null ? parseFloat(l.humedad) : null,
            peso: l.peso !== null ? parseFloat(l.peso) : null,
            sonido: l.sonido !== null ? parseFloat(l.sonido) : null,
          }));
          setLecturas(processedLecturas);
        }
      } catch (err) {
        console.error("Error al cargar lecturas:", err);
        // El interceptor se encarga del logout. Aquí solo mostramos el error.
        if (isAxiosError(err) && err.response) {
          setError(err.response.data.message || "Error al cargar los datos de la colmena.");
        } else {
          setError("Ocurrió un error inesperado. Revisa tu conexión.");
        }
        setError('No se pudieron cargar los datos. Inténtalo de nuevo más tarde.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLecturas();
  }, [colmenaId, authState.accessToken, timeRange]);

  const filteredLecturas = useMemo(() => {
    return lecturas;
  }, [lecturas]);

  const ultimaLectura = useMemo(() => {
    if (filteredLecturas.length === 0) return null;
    return filteredLecturas[filteredLecturas.length - 1];
  }, [filteredLecturas]);

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" style={styles.centered} />;
  }

  if (error) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Detalle de la Colmena</Text>
      <Text style={styles.subtitle}>{nombre}</Text>

      {ultimaLectura ? (
        <View style={styles.latestReadingContainer}>
          <Text style={styles.latestReadingTitle}>
            Última Lectura ({format(parseISO(ultimaLectura.fecha_registro), 'dd MMM, HH:mm', { locale: es })}h)
          </Text>
          <View style={styles.latestReadingGrid}>
            <Text style={styles.latestReadingItem}>🌡️ {ultimaLectura.temperatura?.toFixed(1)} °C</Text>
            <Text style={styles.latestReadingItem}>💧 {ultimaLectura.humedad?.toFixed(1)} %</Text>
            <Text style={styles.latestReadingItem}>⚖️ {ultimaLectura.peso?.toFixed(1)} kg</Text>
            <Text style={styles.latestReadingItem}>🔊 {ultimaLectura.sonido?.toFixed(1)} dB</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.infoText}>No hay lecturas recientes.</Text>
      )}

      <View style={styles.timeRangeContainer}>
        {(['day', 'week', 'month'] as TimeRange[]).map((range) => (
          <TouchableOpacity
            key={range}
            style={[styles.timeRangeButton, timeRange === range && styles.timeRangeButtonSelected]}
            onPress={() => setTimeRange(range)}
          >
            <Text style={[styles.timeRangeButtonText, timeRange === range && styles.timeRangeButtonTextSelected]}>
              {range === 'day' ? 'Día' : range === 'week' ? 'Semana' : 'Mes'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {allChartProps.map((props) => (
        <TouchableOpacity key={props.title} onPress={() => handleChartPress(props)}>
          <SensorChart {...props} data={filteredLecturas} timeRange={timeRange} />
        </TouchableOpacity>
      ))}

      {/* Modal de comparación (Victory) */}
      {selectedChart && (
        <ComparisonChartModal
          visible={modalVisible}
          onClose={handleCloseModal}
          lecturas={filteredLecturas}
          timeRange={timeRange}
          baseKey={selectedChart.dataKey}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  closeButton: {
    marginTop: 30,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  comparisonContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  comparisonButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  comparisonButton: {
    backgroundColor: '#ddd',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    margin: 5,
  },
  comparisonButtonSelected: {
    backgroundColor: '#2196F3',
  },
  comparisonButtonText: {
    color: '#333',
    fontWeight: '500',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#343A40',
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#6C757D',
    marginBottom: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
  infoText: {
    textAlign: 'center',
    color: '#6C757D',
    marginVertical: 20,
  },
  latestReadingContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  latestReadingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#495057',
  },
  latestReadingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  latestReadingItem: {
    fontSize: 16,
    width: '48%',
    marginBottom: 8,
    color: '#343A40',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: '#E9ECEF',
    borderRadius: 8,
    padding: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
  },
  timeRangeButtonSelected: {
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  timeRangeButtonText: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#6C757D',
  },
  timeRangeButtonTextSelected: {
    color: '#007BFF',
  },
  chartContainer: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  chartStyle: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartPlaceholder: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
  },
  chartPlaceholderText: {
    color: '#6c757d',
    fontSize: 14,
  },
});

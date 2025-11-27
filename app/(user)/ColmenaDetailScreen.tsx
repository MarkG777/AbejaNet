import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { isAxiosError } from 'axios';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { VictoryArea, VictoryAxis, VictoryChart, VictoryGroup, VictoryLegend, VictoryLine, VictoryScatter, VictoryTheme, VictoryTooltip, VictoryVoronoiContainer } from 'victory-native';
import { Lectura, SensorChartProps, SensorDataKey, TimeRange } from '../components/SensorChart';

// Tipos para las props de la gráfica de comparación
interface ComparisonChartProps {
  lecturas: Lectura[];
  timeRange: TimeRange;
  selectedChart: Omit<SensorChartProps, 'data' | 'timeRange'>;
  comparisonKey: SensorDataKey | null;
}

// Tipos para las props de la gráfica

const labelMap: Record<SensorDataKey, string> = {
  temperatura: 'Temperatura',
  humedad: 'Humedad',
  peso: 'Peso',
  sonido: 'Sonido',
};

const unitMap: Record<SensorDataKey, string> = {
  temperatura: '°C',
  humedad: '%',
  peso: 'kg',
  sonido: 'dB',
};

const colorMap: Record<SensorDataKey, string> = {
  temperatura: 'rgba(255,99,132,1)',
  humedad: 'rgba(54,162,235,1)',
  peso: 'rgba(75,192,192,1)',
  sonido: 'rgba(153,102,255,1)',
};

const SENSOR_THRESHOLDS = {
  temperatura: {
    optimal: [32, 36],
    warning: [29, 38],
    danger: [0, 28],
    danger_high: [39, 50]
  },
  humedad: {
    optimal: [50, 60],
    warning: [40, 70],
    danger: [0, 39],
    danger_high: [71, 100]
  },
} as const;

const THRESHOLD_COLORS = {
  danger: 'rgba(255, 99, 132, 0.2)',
  warning: 'rgba(255, 206, 86, 0.2)',
  optimal: 'rgba(75, 192, 192, 0.2)',
};

const processDataForPreview = (lecturas: Lectura[], timeRange: TimeRange): Lectura[] => {
  if (timeRange !== 'day' || lecturas.length === 0) {
    return lecturas;
  }

  const hourlyData: { [hour: string]: { sums: Record<SensorDataKey, number>; counts: Record<SensorDataKey, number>; } } = {};

  lecturas.forEach(lectura => {
    const hour = format(parseISO(lectura.fecha_registro), 'yyyy-MM-dd HH:00');
    if (!hourlyData[hour]) {
      hourlyData[hour] = {
        sums: { temperatura: 0, humedad: 0, peso: 0, sonido: 0 },
        counts: { temperatura: 0, humedad: 0, peso: 0, sonido: 0 },
      };
    }

    (['temperatura', 'humedad', 'peso', 'sonido'] as SensorDataKey[]).forEach(key => {
      if (lectura[key] !== null && typeof lectura[key] === 'number') {
        hourlyData[hour].sums[key] += lectura[key]!;
        hourlyData[hour].counts[key]++;
      }
    });
  });

  const averagedLecturas: Lectura[] = Object.keys(hourlyData).map(hour => {
    const data = hourlyData[hour];
    return {
      fecha_registro: parseISO(hour).toISOString(),
      temperatura: data.counts.temperatura > 0 ? data.sums.temperatura / data.counts.temperatura : null,
      humedad: data.counts.humedad > 0 ? data.sums.humedad / data.counts.humedad : null,
      peso: data.counts.peso > 0 ? data.sums.peso / data.counts.peso : null,
      sonido: data.counts.sonido > 0 ? data.sums.sonido / data.counts.sonido : null,
    } as Lectura;
  });

  return averagedLecturas.sort((a, b) => new Date(a.fecha_registro).getTime() - new Date(b.fecha_registro).getTime());
};

const allChartProps: Omit<SensorChartProps, 'data' | 'timeRange'>[] = [
  { title: "Temperatura", dataKey: "temperatura", color: "rgba(255, 99, 132, 1)", unit: "°C" },
  { title: "Humedad", dataKey: "humedad", color: "rgba(54, 162, 235, 1)", unit: "%" },
  { title: "Peso", dataKey: "peso", color: "rgba(75, 192, 192, 1)", unit: "kg" },
  { title: "Sonido", dataKey: "sonido", color: "rgba(153, 102, 255, 1)", unit: "dB" }
];



// Tipos para las props de la gráfica de comparación
// Componente optimizado para la gráfica de comparación en el modal

// Componente para el resumen detallado
const DetailedSummary = ({ data }: { data: Lectura[] }) => {
  if (data.length < 1) {
    return <Text style={styles.infoText}>No hay lecturas recientes.</Text>;
  }

  const lastDataPoint = data[data.length - 1];
  const firstDataPoint = data[0];

  return (
    <View style={styles.summaryContainer}>
      <Text style={styles.summaryTitle}>
        Resumen del Período ({format(parseISO(lastDataPoint.fecha_registro), 'dd MMM, HH:mm', { locale: es })}h)
      </Text>
      <View style={styles.summaryGrid}>
        {allChartProps.map(({ dataKey, title, unit }) => {
          const lastValue = lastDataPoint[dataKey];
          const firstValue = firstDataPoint[dataKey];

          if (lastValue === null || lastValue === undefined || firstValue === null || firstValue === undefined) {
            return (
              <View key={dataKey} style={styles.summaryItem}>
                <Text style={styles.summaryItemTitle}>{title}</Text>
                <Text style={styles.summaryItemValue}>--</Text>
              </View>
            );
          }

          const totalDelta = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
          const deltaSign = totalDelta >= 0 ? '+' : '';
          const deltaColor = totalDelta >= 0 ? '#2e7d32' : '#c62828';

          return (
            <View key={dataKey} style={styles.summaryItem}>
              <Text style={styles.summaryItemTitle}>{title}</Text>
              <Text style={styles.summaryItemValue}>{`${lastValue.toFixed(1)} ${unit}`}</Text>
              <Text style={[styles.summaryItemDelta, { color: deltaColor }]}>
                {`(${deltaSign}${totalDelta.toFixed(1)}%)`}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// Pantalla Principal
export default function ColmenaDetailScreen() {
  const { colmenaId, nombre } = useLocalSearchParams<{ colmenaId: string; nombre: string }>();
  const { authState } = useAuth();
  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('day');

  // Estado para la gráfica interactiva
  const [activeKeys, setActiveKeys] = useState<SensorDataKey[]>(['temperatura', 'peso']); // Métricas activas por defecto
  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);

  const toggleKey = (k: SensorDataKey) => {
    setActiveKeys(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
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

  
  const processDataForPreview = (data: Lectura[], range: TimeRange): Lectura[] => {
    if (range !== 'day' || data.length < 24) { // Solo promediar si hay suficientes datos
      return data;
    }

    const hourlyData: { [hour: string]: { sums: Record<SensorDataKey, number>; counts: Record<SensorDataKey, number>; } } = {};

    data.forEach(lectura => {
      const hour = format(parseISO(lectura.fecha_registro), 'yyyy-MM-dd HH:00');
      if (!hourlyData[hour]) {
        hourlyData[hour] = {
          sums: { temperatura: 0, humedad: 0, peso: 0, sonido: 0 },
          counts: { temperatura: 0, humedad: 0, peso: 0, sonido: 0 },
        };
      }
      allChartProps.forEach(({ dataKey }) => {
        if (lectura[dataKey] !== null && typeof lectura[dataKey] === 'number') {
          hourlyData[hour].sums[dataKey] += lectura[dataKey]!;
          hourlyData[hour].counts[dataKey]++;
        }
      });
    });

    return Object.keys(hourlyData).map(hour => {
      const hourData = hourlyData[hour];
      const newLectura: any = { fecha_registro: parseISO(hour).toISOString() };
      allChartProps.forEach(({ dataKey }) => {
        newLectura[dataKey] = hourData.counts[dataKey] > 0 ? hourData.sums[dataKey] / hourData.counts[dataKey] : null;
      });
      return newLectura;
    }).sort((a, b) => new Date(a.fecha_registro).getTime() - new Date(b.fecha_registro).getTime());
  };

  const chartPreviewData = useMemo(() => processDataForPreview(lecturas, timeRange), [lecturas, timeRange]);


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

      <DetailedSummary data={chartPreviewData} />

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

      {/* Nueva Gráfica Interactiva */}
      <InteractiveChart
        lecturas={lecturas}
        timeRange={timeRange}
        activeKeys={activeKeys}
        onToggleKey={toggleKey}
        selectedPoint={selectedPoint}
        onSetSelectedPoint={setSelectedPoint}
      />
    </ScrollView>
  );
}

interface ChartPoint {
  x: number;
  y: number;
  raw: number;
  series: string;
  metricKey: SensorDataKey;
}

interface InteractiveChartProps {
  lecturas: Lectura[];
  timeRange: TimeRange;
  activeKeys: SensorDataKey[];
  onToggleKey: (key: SensorDataKey) => void;
  selectedPoint: any | null;
  onSetSelectedPoint: (point: any | null) => void;
}

const InteractiveChart = ({ lecturas, timeRange, activeKeys, onToggleKey, selectedPoint, onSetSelectedPoint }: InteractiveChartProps) => {
  const processedData = useMemo(() => processDataForPreview(lecturas, timeRange), [lecturas, timeRange]);

  const firstValues = useMemo(() => {
    if (processedData.length === 0) {
      return { temperatura: 0, humedad: 0, peso: 0, sonido: 0 };
    }
    const first = processedData[0];
    return {
      temperatura: first?.temperatura ?? 0,
      humedad: first?.humedad ?? 0,
      peso: first?.peso ?? 0,
      sonido: first?.sonido ?? 0,
    } as Record<SensorDataKey, number>;
  }, [processedData]);

      const buildSeries = (k: SensorDataKey) => {
    const firstValue = processedData.length > 0 ? (processedData[0][k] || 0) : 0;
    return processedData.map((d: Lectura, i: number) => {
      const currentValue = d[k] || 0;
      const delta = firstValue !== 0 ? ((currentValue - firstValue) / firstValue) * 100 : 0;
      return {
        x: i,
        y: currentValue,
        raw: currentValue,
        series: labelMap[k],
        metricKey: k,
        delta: delta,
      };
    });
  };

  const buildWeightSeries = () => {
    const series = buildSeries('peso');
            if (timeRange === 'day') {
      return series.map((point: ChartPoint) => ({ ...point, symbol: "circle", size: 3, color: colorMap.peso }));
    }
    return series.map((point: ChartPoint, index: number, arr: ChartPoint[]) => {
      if (index === 0) return { ...point, color: 'green', symbol: "circle", size: 3 };
      const prevValue = arr[index - 1].y;
      const currentValue = point.y;
      if (prevValue === 0) return { ...point, color: 'green', symbol: "circle", size: 3 };
      const percentChange = ((currentValue - prevValue) / prevValue) * 100;
      let color = 'green', symbol: "circle" | "star" | "triangleUp" = "circle", size = 3;
      if (percentChange < -10) { color = 'red'; symbol = 'star'; size = 5; }
      else if (percentChange < -2) { color = 'orange'; symbol = 'triangleUp'; size = 4; }
      else if (percentChange > 15) { color = 'red'; symbol = 'star'; size = 5; }
      return { ...point, color, symbol, size };
    });
  };

    const tickValues = useMemo(() => {
    const totalPoints = processedData.length;
    if (totalPoints <= 10) return processedData.map((_: Lectura, i: number) => i);
    const tickCount = Math.min(totalPoints, 7);
    const step = Math.ceil(totalPoints / tickCount);
    return Array.from({ length: tickCount }, (_: unknown, i: number) => i * step).filter(i => i < totalPoints);
  }, [processedData]);

  const formatLabel = (fecha: string) => {
    if (!fecha) return '';
    const d = parseISO(fecha);
    if (timeRange === 'day') return format(d, 'HH:mm');
    if (timeRange === 'week') return format(d, 'eee', { locale: es });
    return format(d, 'dd/MM');
  };

  const CustomTooltip = ({ datum }: any) => {
    if (!datum) return null;
    
    const xIndex = datum.x;
    const currentData = processedData[xIndex];
    
    if (!currentData) return null;

    return (
      <View style={styles.tooltipContainer}>
        <View style={styles.tooltipHeader}>
          <Text style={styles.tooltipDate}>
            📅 {formatLabel(currentData.fecha_registro)}
          </Text>
        </View>
        {activeKeys.map(key => {
          const value = currentData[key];
          if (value === null) return null;
          
          const firstValue = firstValues[key];
          const delta = firstValue !== 0 ? ((value - firstValue) / firstValue) * 100 : 0;
          const deltaSign = delta >= 0 ? '+' : '';
          const deltaColor = delta >= 0 ? '#4caf50' : '#f44336';
          
          return (
            <View key={key} style={styles.tooltipRow}>
              <View style={[styles.tooltipColorBar, { backgroundColor: colorMap[key] }]} />
              <View style={styles.tooltipContent}>
                <View style={styles.tooltipTopRow}>
                  <Text style={styles.tooltipLabel}>{labelMap[key]}</Text>
                  <Text style={styles.tooltipValue}>{value.toFixed(1)} {unitMap[key]}</Text>
                </View>
                <View style={styles.tooltipBottomRow}>
                  <Text style={[styles.tooltipDelta, { color: deltaColor }]}>
                    {deltaSign}{delta.toFixed(1)}% {delta >= 0 ? '↗' : '↘'}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderThresholdLegend = () => {
    const legendDataWeight = [
      { name: "Normal", symbol: { fill: "green", type: "circle" } },
      { name: "Alerta", symbol: { fill: "orange", type: "triangleUp" } },
      { name: "Peligro", symbol: { fill: "red", type: "star" } }
    ];
    if (!activeKeys.includes('peso')) return null;

    return (
      <View style={{ alignItems: 'center', marginTop: 5, marginBottom: 5 }}>
        <VictoryLegend centerTitle orientation="horizontal" gutter={20} style={{ border: { stroke: "#c4c4c4" }, title: { fontSize: 14, fontWeight: 'bold' } }} data={legendDataWeight} />
      </View>
    );
  };

  return (
    <View style={styles.chartContainer}>
       <View style={styles.chipRow}>
          {(Object.keys(labelMap) as SensorDataKey[]).map(k => (
            <Pressable key={k} style={[styles.chip, activeKeys.includes(k) && styles.chipActive]} onPress={() => onToggleKey(k)}>
              <Text style={activeKeys.includes(k) ? styles.chipActiveText : styles.chipText}>{labelMap[k]}</Text>
            </Pressable>
          ))}
        </View>

      {processedData.length > 0 ? (
        <VictoryChart
          width={Dimensions.get('window').width - 20}
          height={300}
          theme={VictoryTheme.material}
          domainPadding={{ y: 20, x: 30 }}
          containerComponent={
            <VictoryVoronoiContainer
              labels={() => ' '}
              labelComponent={
                <VictoryTooltip
                  flyoutComponent={<CustomTooltip />}
                  cornerRadius={8}
                  pointerLength={0}
                  flyoutStyle={{ fill: 'transparent', stroke: 'transparent' }}
                />
              }
              onActivated={(pts) => onSetSelectedPoint(pts && pts[0] ? pts[0] : null)}
            />
          }
        >
                    <VictoryAxis dependentAxis tickFormat={(t) => `${t.toFixed(0)}`} />
          <VictoryAxis tickValues={tickValues} tickFormat={(t) => formatLabel(processedData[t]?.fecha_registro)} style={{ tickLabels: { fontSize: 10, angle: 30, padding: 20, textAnchor: 'start' } }} />

          {activeKeys.some(k => k in SENSOR_THRESHOLDS) && (
            <VictoryGroup>
              {activeKeys.filter(k => k in SENSOR_THRESHOLDS).map(key => 
                Object.entries(SENSOR_THRESHOLDS[key as keyof typeof SENSOR_THRESHOLDS]).map(([thresholdKey, range]) => {
                  let color = '';
                  if (thresholdKey.startsWith('danger')) {
                    color = THRESHOLD_COLORS.danger;
                  } else if (thresholdKey === 'warning') {
                    color = THRESHOLD_COLORS.warning;
                  } else if (thresholdKey === 'optimal') {
                    color = THRESHOLD_COLORS.optimal;
                  }

                  return <VictoryArea
                    key={`${key}-${thresholdKey}`}
                    data={[{ x: 0, y0: range[0], y: range[1] }, { x: processedData.length - 1, y0: range[0], y: range[1] }]}
                    style={{ data: { fill: color } }}
                  />
                })
              )}
            </VictoryGroup>
          )}
          
          {activeKeys.map(k => (
            <VictoryLine key={k} data={buildSeries(k)} style={{ data: { stroke: colorMap[k], strokeWidth: 2 } }} />
          ))}

          {activeKeys.includes('peso') && (
            <VictoryScatter data={buildWeightSeries()} style={{ data: { fill: ({ datum }) => datum.color } }} size={({ datum }) => datum.size} symbol={({ datum }) => datum.symbol} />
          )}

          {selectedPoint && (
            <VictoryScatter data={[selectedPoint]} size={6} style={{ data: { fill: colorMap[selectedPoint.metricKey as SensorDataKey] } }} />
          )}
        </VictoryChart>
      ) : (
        <View style={styles.chartPlaceholder}>
          <Text style={styles.chartPlaceholderText}>No hay datos para mostrar.</Text>
        </View>
      )}
      {renderThresholdLegend()}
    </View>
  );
};

const styles = StyleSheet.create({
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
  summaryContainer: {
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
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#495057',
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  summaryItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryItemTitle: {
    fontSize: 14,
    color: '#6C757D',
  },
  summaryItemValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#343A40',
    marginVertical: 2,
  },
  summaryItemDelta: {
    fontSize: 14,
    fontWeight: '500',
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: 10,
  },
  chip: {
    backgroundColor: '#ddd',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    margin: 5,
  },
  chipActive: {
    backgroundColor: '#007BFF',
  },
  chipText: {
    color: '#333',
    fontWeight: '500',
  },
  chipActiveText: {
    color: '#fff',
    fontWeight: '500',
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
  tooltipContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    minWidth: 240,
    maxWidth: 300,
    overflow: 'hidden',
  },
  tooltipHeader: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
  },
  tooltipDate: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#555',
    textAlign: 'center',
  },
  tooltipRow: {
    flexDirection: 'row',
    backgroundColor: '#fafafa',
    marginVertical: 1,
    overflow: 'hidden',
  },
  tooltipColorBar: {
    width: 6,
    alignSelf: 'stretch',
  },
  tooltipContent: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tooltipTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tooltipBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tooltipLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  tooltipValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  tooltipDelta: {
    fontSize: 13,
    fontWeight: '600',
  },
});

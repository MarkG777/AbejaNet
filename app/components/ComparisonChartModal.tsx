import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useMemo, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { VictoryArea, VictoryAxis, VictoryChart, VictoryGroup, VictoryLegend, VictoryLine, VictoryScatter, VictoryTheme, VictoryTooltip, VictoryVoronoiContainer } from 'victory-native';

export type MetricKey = 'temperatura' | 'humedad' | 'peso' | 'sonido';
export type TimeRange = 'day' | 'week' | 'month';

interface Lectura {
  fecha_registro: string;
  temperatura: number | null;
  humedad: number | null;
  peso: number | null;
  sonido: number | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  lecturas: Lectura[];
  timeRange: TimeRange;
  baseKey: MetricKey;
}

const labelMap: Record<MetricKey, string> = {
  temperatura: 'Temperatura',
  humedad: 'Humedad',
  peso: 'Peso',
  sonido: 'Sonido',
};

const unitMap: Record<MetricKey, string> = {
  temperatura: '°C',
  humedad: '%',
  peso: 'kg',
  sonido: 'dB',
};

const colorMap: Record<MetricKey, string> = {
  temperatura: 'rgba(255,99,132,1)',
  humedad: 'rgba(54,162,235,1)',
  peso: 'rgba(75,192,192,1)',
  sonido: 'rgba(153,102,255,1)',
};

const processLecturas = (lecturas: Lectura[], timeRange: TimeRange): Lectura[] => {
  if (timeRange !== 'day' || lecturas.length === 0) {
    return lecturas;
  }

  const hourlyData: { [hour: string]: { sums: Record<MetricKey, number>; counts: Record<MetricKey, number>; } } = {};

  lecturas.forEach(lectura => {
    const hour = format(parseISO(lectura.fecha_registro), 'yyyy-MM-dd HH:00');
    if (!hourlyData[hour]) {
      hourlyData[hour] = {
        sums: { temperatura: 0, humedad: 0, peso: 0, sonido: 0 },
        counts: { temperatura: 0, humedad: 0, peso: 0, sonido: 0 },
      };
    }

    (['temperatura', 'humedad', 'peso', 'sonido'] as MetricKey[]).forEach(key => {
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

const SENSOR_THRESHOLDS = {
  temperatura: {
    optimal: [32, 36],
    warning: [29, 38], // Incluye el rango óptimo y se extiende
    danger: [0, 28], // Rango inferior de peligro
    danger_high: [39, 50] // Rango superior de peligro
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

const ComparisonChartModal: React.FC<Props> = ({ visible, onClose, lecturas, timeRange, baseKey }) => {
  const [activeKeys, setActiveKeys] = useState<MetricKey[]>([baseKey]);
  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);

  const processedData = useMemo(() => processLecturas(lecturas, timeRange), [lecturas, timeRange]);
  

  const toggleKey = (k: MetricKey) => {
    setActiveKeys(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  };

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
    } as Record<MetricKey, number>;
  }, [processedData]);

  const buildSeries = (k: MetricKey) => {
        const firstValue = processedData.length > 0 ? (processedData[0][k] || 0) : 0;
    return processedData.map((d, i) => {
      const currentValue = d[k] || 0;
      const delta = firstValue !== 0 ? ((currentValue - firstValue) / firstValue) * 100 : 0;
      return {
        x: i,
        y: currentValue, // Usar el valor bruto para el eje Y
        raw: currentValue,
        series: labelMap[k],
        metricKey: k,
        delta: delta, // Mantener el delta para el tooltip
      };
    });
  };

  const buildWeightSeries = () => {
    const series = buildSeries('peso');

    // La lógica de color solo aplica a vistas donde los puntos son promedios diarios
    if (timeRange === 'day') {
      return series.map(point => ({ ...point, symbol: "circle", size: 3, color: colorMap.peso }));
    }

    return series.map((point, index, arr) => {
      if (index === 0) {
        return { ...point, color: 'green', symbol: "circle", size: 3 }; // El primer punto es la referencia
      }

      const prevValue = arr[index - 1].y;
      const currentValue = point.y;

      if (prevValue === 0) {
        return { ...point, color: 'green', symbol: "circle", size: 3 }; // Evitar división por cero
      }

      const percentChange = ((currentValue - prevValue) / prevValue) * 100;

      let color = 'green'; // Normal
      let symbol: "circle" | "star" | "triangleUp" = "circle";
      let size = 3;

      if (percentChange < -10) { // Pérdida drástica
        color = 'red';
        symbol = 'star';
        size = 5;
      } else if (percentChange < -2) { // Advertencia de pérdida
        color = 'orange';
        symbol = 'triangleUp'; // Usar un símbolo diferente para advertencia
        size = 4;
      } else if (percentChange > 15) { // Ganancia drástica (posible pillaje)
        color = 'red';
        symbol = 'star';
        size = 5;
      }

      return { ...point, color, symbol, size };
    });
  };

    const tickValues = useMemo(() => {
    const totalPoints = processedData.length;
    if (totalPoints <= 10) {
      return processedData.map((_, i) => i);
    }
    const tickCount = Math.min(totalPoints, 7); // Mostrar un máximo de 7 ticks
    const step = Math.ceil(totalPoints / tickCount);
    return Array.from({ length: tickCount }, (_, i) => i * step).filter(i => i < totalPoints);
  }, [processedData]);

  const formatLabel = (fecha: string) => {
    const d = parseISO(fecha);
    if (timeRange === 'day') return format(d, 'HH:mm');
    if (timeRange === 'week') return format(d, 'eee', { locale: es });
    return format(d, 'dd/MM');
  };

      const inactiveKeys = (['temperatura','humedad','peso','sonido'] as MetricKey[]).filter(k => !activeKeys.includes(k));

  const TopLegend = () => (
    <View style={styles.legendContainer}>
      {activeKeys.map(key => (
        <View key={key} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colorMap[key] }]} />
          <Text style={styles.legendText}>{labelMap[key]}</Text>
        </View>
      ))}
    </View>
  );

  const renderSummary = () => {
    const getLegendTitle = () => {
      if (activeKeys.includes('temperatura') && activeKeys.includes('humedad')) {
        return "Umbrales (Temp. y Hum.) y Variación (Peso)";
      }
      if (activeKeys.includes('temperatura')) return "Umbrales de Temperatura";
      if (activeKeys.includes('humedad')) return "Umbrales de Humedad";
      if (activeKeys.includes('peso')) return "Análisis de Variación de Peso";
      return null;
    };

    const title = getLegendTitle();
    if (processedData.length < 2) return null;

    const lastDataPoint = processedData[processedData.length - 1];
    const firstDataPoint = processedData[0];

    return (
      <View style={styles.summaryContainer}>
        {title && <Text style={styles.summaryTitle}>{title}</Text>}
        {activeKeys.map(key => {
          const lastValue = lastDataPoint[key];
          const firstValue = firstDataPoint[key];

          if (lastValue === null || firstValue === null) return null;

          const totalDelta = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
          const deltaSign = totalDelta >= 0 ? '+' : '';
          const deltaColor = totalDelta >= 0 ? '#2e7d32' : '#c62828'; // Verde oscuro / Rojo oscuro

          return (
            <Text key={key} style={styles.summaryText}>
              {`${labelMap[key]}: `}
              <Text style={{ fontWeight: 'bold' }}>{`${lastValue.toFixed(1)} ${unitMap[key]} `}</Text>
              <Text style={{ color: deltaColor }}>
                {`(${deltaSign}${totalDelta.toFixed(1)}%)`}
              </Text>
            </Text>
          );
        })}
      </View>
    );
  };

  const renderThresholdLegend = () => {
    const legendDataTempHum = [
      { name: "Peligro", symbol: { fill: THRESHOLD_COLORS.danger, type: 'square' } },
      { name: "Advertencia", symbol: { fill: THRESHOLD_COLORS.warning, type: 'square' } },
      { name: "Óptimo", symbol: { fill: THRESHOLD_COLORS.optimal, type: 'square' } }
    ];

    const legendDataWeight = [
      { name: "Normal", symbol: { fill: "green", type: "circle" } },
      { name: "Alerta", symbol: { fill: "orange", type: "triangleUp" } },
      { name: "Peligro", symbol: { fill: "red", type: "star" } }
    ];

    let data;
    let title = "";

    if (baseKey === 'temperatura' || baseKey === 'humedad') {
      data = legendDataTempHum;
    } else if (activeKeys.includes('peso')) {
      data = legendDataWeight;
    } else {
      return null; // No mostrar leyenda si no es aplicable
    }

    return (
      <View style={{ alignItems: 'center', marginTop: 5, marginBottom: 5 }}>
        <VictoryLegend
          centerTitle
          orientation="horizontal"
          gutter={20}
          style={{ border: { stroke: "#c4c4c4" }, title: { fontSize: 14, fontWeight: 'bold' } }}
          data={data}
        />
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.title}>{labelMap[baseKey]} – Comparación</Text>

        <TopLegend />

        {processedData.length > 0 ? (
          <VictoryChart
            width={Dimensions.get('window').width - 20}
            height={300}
            theme={VictoryTheme.material}
            domainPadding={{ y: 20, x: 30 }}
            containerComponent={
            <VictoryVoronoiContainer
              labels={({ datum }) => `${datum.series}\n${datum.raw?.toFixed(1)} ${unitMap[datum.metricKey as MetricKey]} (${datum.delta.toFixed(1)}%)`}
              labelComponent={<VictoryTooltip cornerRadius={4} flyoutStyle={{ fill: '#fff' }} style={{ fontSize: 16 }} />}
              onActivated={(pts) => pts && pts[0] ? setSelectedPoint(pts[0]) : null}
            />
          }
        >
          <VictoryAxis dependentAxis tickFormat={(t) => `${t.toFixed(0)}`} />

            {/* Bandas de umbrales para la métrica base */}
            {baseKey in SENSOR_THRESHOLDS && (
              <VictoryGroup>
                {Object.entries(SENSOR_THRESHOLDS[baseKey as keyof typeof SENSOR_THRESHOLDS]).map(([key, range]) => {
                  if (key.startsWith('danger')) {
                     return <VictoryArea
                        key={`${key}-area`}
                        data={[{ x: 0, y0: range[0], y: range[1] }, { x: processedData.length - 1, y0: range[0], y: range[1] }]}
                        style={{ data: { fill: THRESHOLD_COLORS.danger } }}
                      />
                  } else {
                    return <VictoryArea
                      key={`${key}-area`}
                      data={[{ x: 0, y0: range[0], y: range[1] }, { x: processedData.length - 1, y0: range[0], y: range[1] }]}
                      style={{ data: { fill: THRESHOLD_COLORS[key as keyof typeof THRESHOLD_COLORS] } }}
                    />
                  }
                })}
              </VictoryGroup>
            )}

          <VictoryAxis style={{ tickLabels: { fontSize: 10 } }} />
                    <VictoryAxis 
            tickValues={tickValues}
            tickFormat={(t) => formatLabel(processedData[t]?.fecha_registro)}
            style={{ tickLabels: { fontSize: 10, angle: 30, padding: 20, textAnchor: 'start' } }}
          />
          {activeKeys.map(k => (
            <VictoryLine
              key={k}
              data={buildSeries(k)}
              style={{ data: { stroke: colorMap[k], strokeWidth: 2 } }}
            />
          ))}

          {/* Puntos coloreados para el peso */}
          {activeKeys.includes('peso') && (
            <VictoryScatter
              data={buildWeightSeries()}
              style={{
                data: {
                  fill: ({ datum }) => datum.color,
                },
              }}
              size={({ datum }) => datum.size}
              symbol={({ datum }) => datum.symbol}
            />
          )}
        {selectedPoint && (
            <VictoryScatter
              data={[selectedPoint]}
              size={6}
              style={{ data: { fill: colorMap[selectedPoint.metricKey as MetricKey] } }}
            />
          )}
          </VictoryChart>
        ) : (
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartPlaceholderText}>No hay datos para mostrar en el período seleccionado.</Text>
          </View>
        )}

        {renderSummary()}
        {renderThresholdLegend()}

        {selectedPoint && (
          <Text style={styles.selectedInfo}>
            {`${selectedPoint.series} ${selectedPoint.raw.toFixed(1)} ${unitMap[selectedPoint.metricKey as MetricKey]} (${selectedPoint.delta.toFixed(1)}%)`}
          </Text>
        )}

        <View style={styles.chipRow}>
          {(Object.keys(labelMap) as MetricKey[]).map(k => (
            <Pressable
              key={k}
              style={[styles.chip, activeKeys.includes(k) && styles.chipActive]}
              onPress={() => toggleKey(k)}
            >
              <Text style={activeKeys.includes(k) ? styles.chipActiveText : styles.chipText}>{labelMap[k]}</Text>
            </Pressable>
          ))}
        </View>

        {inactiveKeys.length > 0 && (
          <View style={styles.deltaRow}>
            {inactiveKeys.map(k => {
              const last = processedData.length > 0 ? processedData[processedData.length - 1][k] ?? 0 : 0;
              const first = firstValues[k];
              const delta = first === 0 ? 0 : ((last - first) * 100) / first;
              return (
                <Text key={k} style={styles.deltaText}>{labelMap[k]} {delta.toFixed(1)}%</Text>
              );
            })}
          </View>
        )}

        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>Cerrar</Text>
        </Pressable>
      </View>
    </Modal>
  );
};

export default ComparisonChartModal;

const styles = StyleSheet.create({
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 14,
    color: '#333',
  },
  summaryContainer: {
    marginTop: 15,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'flex-start',
  },
  summaryText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    alignSelf: 'center',
  },
  chartPlaceholder: {
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    width: Dimensions.get('window').width - 20,
    borderRadius: 8,
  },
  chartPlaceholderText: {
    color: '#6c757d',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  container: {
    flex: 1,
    paddingTop: 40,
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
  },
  chip: {
    backgroundColor: '#ddd',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    margin: 5,
  },
  chipActive: {
    backgroundColor: '#2196F3',
  },
  chipText: {
    color: '#333',
    fontWeight: '500',
  },
  chipActiveText: {
    color: '#fff',
    fontWeight: '500',
  },
  deltaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
  },
  deltaText: {
    margin: 4,
    color: '#666',
    fontSize: 12,
  },
  closeBtn: {
    marginTop: 20,
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  selectedInfo: {
    marginTop: 12,
    fontSize: 20, // Increased font size
    fontWeight: '600',
    color: '#333',
    paddingVertical: 5,
  },
  closeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

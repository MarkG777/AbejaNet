import React, { useState, useMemo } from 'react';
import { View, Text, Modal, StyleSheet, Dimensions, Pressable } from 'react-native';
import { VictoryChart, VictoryLine, VictoryScatter, VictoryTheme, VictoryAxis, VictoryVoronoiContainer, VictoryTooltip, VictoryLegend, VictoryGroup } from 'victory-native';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

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

const ComparisonChartModal: React.FC<Props> = ({ visible, onClose, lecturas, timeRange, baseKey }) => {
  const [activeKeys, setActiveKeys] = useState<MetricKey[]>([baseKey]);
  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);
  

  const toggleKey = (k: MetricKey) => {
    setActiveKeys(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  };

  const firstValues = useMemo(() => {
    const first = lecturas[0];
    return {
      temperatura: first?.temperatura ?? 0,
      humedad: first?.humedad ?? 0,
      peso: first?.peso ?? 0,
      sonido: first?.sonido ?? 0,
    } as Record<MetricKey, number>;
  }, [lecturas]);

  const buildSeries = (key: MetricKey) => {
    return lecturas.map(l => {
      const raw = l[key] ?? 0;
      const delta = firstValues[key] === 0 ? 0 : ((raw - firstValues[key]) * 100) / firstValues[key];
      return {
        x: formatLabel(l.fecha_registro),
        y: delta, // show percentage change
        raw,
        delta,
        series: labelMap[key],
        metricKey: key,
      };
    });
  };

  const formatLabel = (fecha: string) => {
    const d = parseISO(fecha);
    if (timeRange === 'day') return format(d, 'HH:mm');
    if (timeRange === 'week') return format(d, 'eee', { locale: es });
    return format(d, 'dd/MM');
  };

  const inactiveKeys = (['temperatura','humedad','peso','sonido'] as MetricKey[]).filter(k => !activeKeys.includes(k));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.title}>{labelMap[baseKey]} – Comparación</Text>

        <VictoryChart
          width={Dimensions.get('window').width - 20}
          height={260}
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
          <VictoryAxis dependentAxis tickFormat={(t) => `${t.toFixed(1)}%`} style={{ tickLabels: { fontSize: 10 } }} />
          <VictoryAxis style={{ tickLabels: { fontSize: 10, angle: 30, padding: 20 } }} />
          {activeKeys.map(k => (
            <VictoryLine
              key={k}
              data={buildSeries(k)}
              style={{ data: { stroke: colorMap[k], strokeWidth: 2 } }}
            />
          ))}
          <VictoryLegend
            x={50}
            y={0}
            gutter={20}
            data={activeKeys.map(k => ({ name: labelMap[k], symbol: { fill: colorMap[k] } }))}
          />
        {selectedPoint && (
            <VictoryScatter
              data={[selectedPoint]}
              size={6}
              style={{ data: { fill: colorMap[selectedPoint.metricKey as MetricKey] } }}
            />
          )}
        </VictoryChart>

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
              const last = lecturas[lecturas.length - 1][k] ?? 0;
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
    marginTop: 8,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

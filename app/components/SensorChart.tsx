import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Tipos de datos (movidos desde ColmenaDetailScreen)
export interface Lectura {
  fecha_registro: string;
  temperatura: number | null;
  humedad: number | null;
  peso: number | null;
  sonido: number | null;
  lluvia: number | null;
}

export type TimeRange = 'day' | 'week' | 'month';

export type SensorDataKey = keyof Omit<Lectura, 'fecha_registro' | 'lluvia'>;


export interface SensorChartProps {
  title: string;
  data: Lectura[];
  dataKey: SensorDataKey;
  color: string;
  unit: string;
  timeRange: TimeRange;
}

// Configuración del gráfico (movida desde ColmenaDetailScreen)
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

  const chartData = {
    labels: data.map(d => {
      const date = parseISO(d.fecha_registro);
      if (timeRange === 'day') {
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
        height={250}
        yAxisLabel=""
        yAxisSuffix={` ${unit}`}
        chartConfig={chartConfig}
        bezier
        style={styles.chartStyle}
        verticalLabelRotation={30}
        horizontalLabelRotation={0}
        fromZero={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
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

export default SensorChart;

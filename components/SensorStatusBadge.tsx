import { SENSOR_OFFLINE_THRESHOLD_MINUTES } from '@/constants/sensorConfig';
import { formatDistanceToNow } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

interface SensorStatusBadgeProps {
  ultimaLecturaEn: string | null | undefined;
  compact?: boolean;
}

export const SensorStatusBadge: React.FC<SensorStatusBadgeProps> = ({ ultimaLecturaEn, compact = false }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('en') ? enUS : es;

  if (!ultimaLecturaEn) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <View style={[styles.dot, { backgroundColor: '#9CA3AF' }]} />
        <Text style={[styles.text, { color: '#6B7280' }, compact && styles.textCompact]}>
          {t('sensor_no_sensor', 'Sin sensor asignado')}
        </Text>
      </View>
    );
  }

  const lastReadingDate = new Date(ultimaLecturaEn);
  const minutesSince = (Date.now() - lastReadingDate.getTime()) / 60000;
  const isOnline = minutesSince < SENSOR_OFFLINE_THRESHOLD_MINUTES;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={[styles.dot, { backgroundColor: isOnline ? '#22C55E' : '#EF4444' }]} />
      <Text style={[styles.text, { color: isOnline ? '#16A34A' : '#DC2626' }, compact && styles.textCompact]}>
        {isOnline
          ? t('sensor_online', 'En línea')
          : t('sensor_offline_since', 'Desconectado hace {{time}}', {
              time: formatDistanceToNow(lastReadingDate, { locale }),
            })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  containerCompact: {
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  textCompact: {
    fontSize: 11,
  },
});

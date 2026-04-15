import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

export interface CsvRow {
  fecha_registro: string;
  temperatura: number | null;
  humedad: number | null;
  peso: number | null;
  sonido: number | null;
}

/**
 * Formatea una fecha ISO a fecha y hora local separadas
 */
const formatDateTime = (isoDate: string): { fecha: string; hora: string } => {
  if (!isoDate) return { fecha: '', hora: '' };
  const d = new Date(isoDate);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return {
    fecha: `${dd}/${mm}/${yyyy}`,
    hora: `${hh}:${min}:${ss}`,
  };
};

/**
 * Formatea un número a 2 decimales o retorna vacío
 */
const fmt = (val: number | null): string => (val !== null && val !== undefined ? val.toFixed(2) : '');

/**
 * Genera contenido CSV organizado con BOM UTF-8 para Excel
 */
const generateCsvContent = (data: CsvRow[], colmenaName: string): string => {
  const BOM = '\uFEFF';
  const SEP = ';';
  const exportDate = formatDateTime(new Date().toISOString());

  const meta = [
    `Reporte de Datos - AbejaNet`,
    `Colmena${SEP}${colmenaName}`,
    `Fecha de exportacion${SEP}${exportDate.fecha} ${exportDate.hora}`,
    `Total de registros${SEP}${data.length}`,
    ``,
  ];

  const header = ['Fecha', 'Hora', 'Temperatura (C)', 'Humedad (%)', 'Peso (kg)', 'Sonido (dB)'].join(SEP);

  const rows = data.map(row => {
    const { fecha, hora } = formatDateTime(row.fecha_registro);
    return [fecha, hora, fmt(row.temperatura), fmt(row.humedad), fmt(row.peso), fmt(row.sonido)].join(SEP);
  });

  return BOM + [...meta, header, ...rows].join('\n');
};

/**
 * Genera el nombre del archivo CSV
 */
const getFileName = (colmenaName: string): string => {
  const date = new Date().toISOString().slice(0, 10);
  const safeName = colmenaName.replace(/[^a-zA-Z0-9]/g, '_');
  return `AbejaNet_${safeName}_${date}.csv`;
};

/**
 * Escribe el CSV en un archivo temporal y retorna la URI
 */
const writeCsvFile = async (content: string, fileName: string): Promise<string> => {
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return fileUri;
};

/**
 * Compartir CSV via menú del sistema (WhatsApp, email, Drive, etc.)
 */
export const shareCsv = async (data: CsvRow[], colmenaName: string): Promise<void> => {
  try {
    const content = generateCsvContent(data, colmenaName);
    const fileName = getFileName(colmenaName);
    const fileUri = await writeCsvFile(content, fileName);

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Error', 'La función de compartir no está disponible en este dispositivo.');
      return;
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: `Exportar datos - ${colmenaName}`,
      UTI: 'public.comma-separated-values-text',
    });
  } catch (error) {
    console.error('Error al compartir CSV:', error);
    Alert.alert('Error', 'No se pudo compartir el archivo CSV.');
  }
};

/**
 * Guardar CSV en Descargas usando SAF (Android) o compartir (iOS)
 */
export const saveCsvToDownloads = async (data: CsvRow[], colmenaName: string): Promise<void> => {
  try {
    const content = generateCsvContent(data, colmenaName);
    const fileName = getFileName(colmenaName);

    if (Platform.OS === 'android') {
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permissions.granted) return;

      const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        fileName,
        'text/csv'
      );
      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      Alert.alert('Guardado', `Archivo "${fileName}" guardado correctamente.`);
    } else {
      // iOS: no tiene carpeta Descargas accesible, usar compartir
      await shareCsv(data, colmenaName);
    }
  } catch (error) {
    console.error('Error al guardar CSV:', error);
    Alert.alert('Error', 'No se pudo guardar el archivo CSV.');
  }
};

// generate_mock_data.js
// =================================================================
// Script para poblar la base de datos con datos de UN SOLO SENSOR simulado
// que envía un paquete completo de datos cada 15 minutos durante un mes.
// =================================================================

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// --- Configuración de la Simulación ---
const COLMENA_NOMBRE = 'Colmena Beta Lab';
const SENSOR_MAC = 'A8:03:2A:B4:C1:D0'; // MAC del ESP32 simulado
const DIAS_A_GENERAR = 30; // Generar datos para un mes
const LECTURAS_POR_HORA = 4; // Una lectura cada 15 minutos
const FECHA_INICIO = new Date();
FECHA_INICIO.setDate(FECHA_INICIO.getDate() - DIAS_A_GENERAR);

// --- Configuración de la Base de Datos ---
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'abeja_user',
  password: process.env.DB_PASS || 'markruger',
  database: process.env.DB_NAME || 'abeja_net_v2',
};

// --- Funciones de Simulación de Datos ---

const simularTemperatura = (date) => {
  const hora = date.getHours();
  const baseTemp = 20;
  const variacionDiaria = 15;
  const temp = baseTemp + (variacionDiaria / 2) * (1 - Math.cos((hora / 24) * 2 * Math.PI));
  return parseFloat((temp + (Math.random() - 0.5)).toFixed(2));
};

const simularHumedad = (temperatura) => {
  const baseHumidity = 75;
  const humidity = baseHumidity - (temperatura - 20) * 2;
  return parseFloat(Math.max(40, Math.min(95, humidity + (Math.random() * 4 - 2))).toFixed(2));
};

const simularPeso = (dia) => {
  const pesoInicial = 15;
  const gananciaDiaria = 0.1;
  const peso = pesoInicial + (dia * gananciaDiaria) + (Math.random() * 0.1 - 0.05);
  return parseFloat(peso.toFixed(2));
};

const simularSonido = (date) => {
  const hora = date.getHours();
  const esDeDia = hora > 7 && hora < 20;
  const baseSound = esDeDia ? 60 : 45;
  return parseFloat((baseSound + Math.random() * 10).toFixed(2));
};

// --- Script Principal ---

const generarDatos = async () => {
  let connection;
  try {
    console.log('Conectando a la base de datos...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Conexión exitosa.');

    // 1. Obtener el ID de la colmena
    console.log(`Buscando la colmena: ${COLMENA_NOMBRE}`);
    const [colmenas] = await connection.execute('SELECT id FROM colmenas WHERE nombre = ?', [COLMENA_NOMBRE]);
    if (colmenas.length === 0) {
      throw new Error(`La colmena '${COLMENA_NOMBRE}' no fue encontrada.`);
    }
    const colmenaId = colmenas[0].id;
    console.log(`Colmena ID: ${colmenaId}`);

    // 2. Crear y asignar UN sensor a la colmena
    console.log(`Asegurando la existencia del sensor con MAC: ${SENSOR_MAC}`);
    await connection.execute(
      'INSERT INTO sensores (mac_address, colmena_id, tipo_sensor, estado, fecha_instalacion) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE colmena_id = VALUES(colmena_id), estado = VALUES(estado)',
      [SENSOR_MAC, colmenaId, 'Multisensor', 'activo', FECHA_INICIO]
    );
    const [rows] = await connection.execute('SELECT id FROM sensores WHERE mac_address = ?', [SENSOR_MAC]);
    const sensorId = rows[0].id;
    console.log(`- Sensor (MAC: ${SENSOR_MAC}) listo con ID: ${sensorId}`);

    // 3. Generar e insertar las lecturas
    const totalLecturas = DIAS_A_GENERAR * 24 * LECTURAS_POR_HORA;
    console.log(`\nGenerando ${totalLecturas} lecturas para ${DIAS_A_GENERAR} días...`);
    
    const fechaActual = new Date(FECHA_INICIO);
    const fechaFin = new Date();

    const sql = 'INSERT INTO lecturas_ambientales (sensor_id, temperatura, humedad, peso, sonido, lluvia, fecha_registro) VALUES ?';
    const todasLasLecturas = [];

    while (fechaActual < fechaFin) {
      const diaSimulacion = (fechaActual - FECHA_INICIO) / (1000 * 60 * 60 * 24);

      const temperatura = simularTemperatura(fechaActual);
      const humedad = simularHumedad(temperatura);
      const peso = simularPeso(diaSimulacion);
      const sonido = simularSonido(fechaActual);
      const lluvia = Math.random() < 0.05;

      todasLasLecturas.push([
        sensorId,
        temperatura,
        humedad,
        peso,
        sonido,
        lluvia,
        new Date(fechaActual) // Clonar la fecha para evitar problemas de referencia
      ]);
      
      fechaActual.setMinutes(fechaActual.getMinutes() + (60 / LECTURAS_POR_HORA));
    }

    // Insertar todas las lecturas en un solo batch para máxima eficiencia
    await connection.query(sql, [todasLasLecturas]);

    console.log(`\n¡Proceso completado! Se insertaron un total de ${todasLasLecturas.length} registros.`);

  } catch (error) {
    console.error('\nError durante la generación de datos:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Conexión a la base de datos cerrada.');
    }
  }
};

generarDatos();

// generate_mock_data.js
// =================================================================
// Script para poblar la base de datos con datos de UN SOLO SENSOR simulado
// que envía un paquete completo de datos cada 15 minutos durante un mes.
// ADAPTADO PARA POSTGRESQL.
//
// ⚠️ ATENCIÓN: LA MANERA MÁS SEGURA Y RECOMENDADA DE EJECUTAR ESTO ES MEDIANTE EL ENDPOINT:
// ⚠️ Invoke-WebRequest -Uri "https://abejanet-backend.onrender.com/debug/populate-data" -Method POST
// ⚠️ (Ejecutar este script localmente requiere que el .env tenga las credenciales de Render
// ⚠️ y puede fallar en Windows por conflictos con las rutas de los módulos ES)
// =================================================================

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js'; // Importar el pool configurado

console.log('--- Script de generación de datos iniciado ---');

// --- Configuración de la ruta para .env ---
// Esto asegura que el script encuentre el .env en su propio directorio (backend/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });


// --- Configuración de la Simulación (valores por defecto) ---
const DEFAULT_COLMENA_NOMBRE = 'Colmena Beta Lab';
const DEFAULT_SENSOR_MAC = 'A2:04:2A:B9:C1:D9';
const DEFAULT_DIAS_A_GENERAR = 30;
const DEFAULT_LECTURAS_POR_HORA = 4;


// --- Funciones de Simulación de Datos (sin cambios) ---

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

// --- Script Principal (Adaptado para PostgreSQL) ---

const generarDatos = async (cerrarPool = true, opciones = {}) => {
  const COLMENA_NOMBRE = opciones.colmena || DEFAULT_COLMENA_NOMBRE;
  const SENSOR_MAC = opciones.mac || DEFAULT_SENSOR_MAC;
  const DIAS_A_GENERAR = opciones.dias || DEFAULT_DIAS_A_GENERAR;
  const LECTURAS_POR_HORA = opciones.lecturasPorHora || DEFAULT_LECTURAS_POR_HORA;
  const FECHA_INICIO = new Date();
  FECHA_INICIO.setDate(FECHA_INICIO.getDate() - DIAS_A_GENERAR);

  let client;
  try {
    console.log('Conectando a la base de datos PostgreSQL...');
    client = await pool.connect();
    console.log('Conexión exitosa.');

    // 1. Obtener el ID de la colmena
    console.log(`Buscando la colmena: ${COLMENA_NOMBRE}`);
    const { rows: colmenas } = await client.query('SELECT id FROM colmenas WHERE nombre = $1', [COLMENA_NOMBRE]);
    if (colmenas.length === 0) {
      throw new Error(`La colmena '${COLMENA_NOMBRE}' no fue encontrada. Asegúrate de crearla primero.`);
    }
    const colmenaId = colmenas[0].id;
    console.log(`Colmena ID: ${colmenaId}`);

    // 2. Crear y asignar UN sensor a la colmena (Sintaxis PostgreSQL)
    console.log(`Asegurando la existencia del sensor con MAC: ${SENSOR_MAC}`);
    const insertSensorQuery = `
      INSERT INTO sensores (mac_address, colmena_id, tipo_sensor, estado, fecha_instalacion)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (mac_address) DO UPDATE SET
        colmena_id = EXCLUDED.colmena_id,
        estado = EXCLUDED.estado
      RETURNING id;
    `;
    const { rows } = await client.query(insertSensorQuery, [SENSOR_MAC, colmenaId, 'Multisensor', 'activo', FECHA_INICIO]);
    const sensorId = rows[0].id;
    console.log(`- Sensor (MAC: ${SENSOR_MAC}) listo con ID: ${sensorId}`);

    // 2.5. Limpiar lecturas previas del sensor para evitar duplicados
    const { rowCount } = await client.query('DELETE FROM lecturas_ambientales WHERE sensor_id = $1', [sensorId]);
    console.log(`- Lecturas previas eliminadas: ${rowCount} registros (si los había).`);

    // 3. Generar e insertar las lecturas
    const totalLecturas = DIAS_A_GENERAR * 24 * LECTURAS_POR_HORA;
    console.log(`\nGenerando ${totalLecturas} lecturas para ${DIAS_A_GENERAR} días...`);
    
    const fechaActual = new Date(FECHA_INICIO);
    const fechaFin = new Date();

    // Para PostgreSQL, es más eficiente hacer una sola transacción grande
    await client.query('BEGIN');
    console.log('Iniciando transacción para inserción masiva...');

    const lecturas = [];
    while (fechaActual < fechaFin) {
      const diaSimulacion = (fechaActual - FECHA_INICIO) / (1000 * 60 * 60 * 24);
      const temperatura = simularTemperatura(fechaActual);
      const humedad = simularHumedad(temperatura);
      const peso = simularPeso(diaSimulacion);
      const sonido = simularSonido(fechaActual);
      const lluvia = Math.random() < 0.05;

      lecturas.push([
        sensorId,
        temperatura,
        humedad,
        peso,
        sonido,
        lluvia,
        new Date(fechaActual)
      ]);
      
      fechaActual.setMinutes(fechaActual.getMinutes() + (60 / LECTURAS_POR_HORA));
    }

    const BATCH_SIZE = 100;
    for (let i = 0; i < lecturas.length; i += BATCH_SIZE) {
      const batch = lecturas.slice(i, i + BATCH_SIZE);
      const valuesPlaceholder = batch.map((_, index) => `($${index * 7 + 1}, $${index * 7 + 2}, $${index * 7 + 3}, $${index * 7 + 4}, $${index * 7 + 5}, $${index * 7 + 6}, $${index * 7 + 7})`).join(',');
      const insertQuery = `INSERT INTO lecturas_ambientales (sensor_id, temperatura, humedad, peso, sonido, lluvia, fecha_registro) VALUES ${valuesPlaceholder}`;
      await client.query(insertQuery, batch.flat());
      console.log(`- Lote insertado: ${i + batch.length} de ${lecturas.length} registros.`);
    }

    await client.query('COMMIT');
    console.log('Transacción completada.');

    console.log(`\n¡Proceso finalizado! Se insertaron un total de ${lecturas.length} registros.`);

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      console.error('Error durante la transacción, se ha hecho rollback.');
    }
    console.error('\nError durante la generación de datos:', error.message);
  } finally {
    if (client) {
      client.release();
      console.log('Cliente liberado.');
    }
    if (cerrarPool) {
      await pool.end();
      console.log('Pool de conexiones cerrado.');
    }
  }
};

// Solo ejecutar si se llama directamente (no cuando se importa)
if (import.meta.url === `file://${process.argv[1]}`) {
  generarDatos();
}

// Exportar la función para usarla desde otros módulos
export default generarDatos;

// connection_test.js
import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('--- Iniciando prueba de conexión simple ---');

// Configuración de la ruta para .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const { Pool } = pg;
const pool = new Pool({
  host: '35.227.164.209', // Usamos la IP directa para evitar problemas de DNS
  user: 'abeja_user',
  database: 'abeja_net_v2_s99y',
  password: 'kIN5PhmpwAtG4MdUSl7DnyMwaRW6n2TI',
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 10000, // 10 segundos
});

const testConnection = async () => {
  let client;
  try {
    console.log('Intentando obtener un cliente del pool...');
    client = await pool.connect();
    console.log('¡Cliente obtenido! Conexión exitosa.');
    
    console.log('Ejecutando una consulta de prueba (SELECT NOW())...');
    const result = await client.query('SELECT NOW()');
    console.log('Consulta exitosa. Hora del servidor:', result.rows[0].now);

  } catch (err) {
    console.error('Ha ocurrido un error durante la prueba:', err.stack);
  } finally {
    if (client) {
      client.release();
      console.log('Cliente liberado.');
    }
    await pool.end();
    console.log('Pool de conexiones cerrado. Prueba finalizada.');
  }
};

testConnection();

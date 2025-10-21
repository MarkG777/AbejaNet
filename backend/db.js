import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

// --- Pool de Conexiones a la Base de Datos PostgreSQL ---
// Leer la DATABASE_URL del archivo .env (que ya tiene el hostname correcto)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 60000, // 60 segundos para conexiones lentas
  statement_timeout: 60000
});

// Exportamos el pool para que otros módulos puedan usarlo para hacer consultas.
export default pool;

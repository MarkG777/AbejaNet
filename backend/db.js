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
  }
});

// Exportamos el pool para que otros módulos puedan usarlo para hacer consultas.
export default pool;

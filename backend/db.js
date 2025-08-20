import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

// --- Pool de Conexiones a la Base de Datos PostgreSQL ---
// Render y otros proveedores de la nube configuran la variable de entorno DATABASE_URL.
// La librería 'pg' la usa automáticamente si está disponible.
// Para desarrollo local, puedes crear un archivo .env con DATABASE_URL="postgresql://user:password@host:port/database"
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Si estás usando una base de datos de Render con SSL, es importante añadir esto:
  ssl: {
    rejectUnauthorized: false
  }
});

// Exportamos el pool para que otros módulos puedan usarlo para hacer consultas.
export default pool;

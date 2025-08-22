import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

// --- Pool de Conexiones a la Base de Datos PostgreSQL ---
// Render y otros proveedores de la nube configuran la variable de entorno DATABASE_URL.
// La librería 'pg' la usa automáticamente si está disponible.
// Para desarrollo local, puedes crear un archivo .env con DATABASE_URL="postgresql://user:password@host:port/database"
const pool = new Pool({
  host: '35.227.164.209', // IP directa para evitar problemas de DNS
  user: 'abeja_user',
  database: 'abeja_net_v2_s99y',
  password: 'kIN5PhmpwAtG4MdUSl7DnyMwaRW6n2TI',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

// Exportamos el pool para que otros módulos puedan usarlo para hacer consultas.
export default pool;

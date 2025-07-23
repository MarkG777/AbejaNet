import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// --- Pool de Conexiones a la Base de Datos ---
// Centralizamos la creación del pool aquí para que pueda ser reutilizado
// en cualquier parte del backend sin tener que redefinirlo.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'abeja_user',
  password: process.env.DB_PASS || 'markruger',
  database: process.env.DB_NAME || 'abeja_net_v2',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Exportamos el pool para que otros módulos puedan usarlo para hacer consultas.
export default pool;

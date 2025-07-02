import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import axios from 'axios'; // ÚNICA importación de axios

// Carga variables de entorno desde .env
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- Pool de Conexiones a la Base de Datos ---
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'abeja_user',
  password: process.env.DB_PASS || 'markruger',
  database: process.env.DB_NAME || 'abeja_net_v2',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// --- Middleware de Autenticación --- 
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

  if (token == null) return res.sendStatus(401); // No autorizado

  jwt.verify(token, process.env.JWT_SECRET, (err, usuario) => {
    if (err) return res.sendStatus(403); // Token inválido
    req.usuario = usuario;
    next();
  });
};

// =================================================================
// RUTAS DE TEST Y SALUD
// =================================================================
app.get('/', (req, res) => res.send('API de AbejaNet online.'));

app.get('/test-db', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, message: 'Conexión a la base de datos exitosa.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al conectar con la base de datos.', error: err.message });
  }
});

// =================================================================
// RUTAS DE USUARIOS Y AUTENTICACIÓN
// =================================================================

app.post('/api/register', async (req, res) => {
  const { correo_electronico, contrasena } = req.body;
  if (!correo_electronico || !contrasena) {
    return res.status(400).json({ success: false, message: 'Correo y contraseña son requeridos.' });
  }

  try {
    const [usuarios] = await pool.execute('SELECT id FROM usuarios WHERE correo_electronico = ?', [correo_electronico]);
    if (usuarios.length > 0) {
      return res.status(409).json({ success: false, message: 'El correo ya está registrado.' });
    }

    const contrasenaHasheada = await bcrypt.hash(contrasena, 10);
    const [resultado] = await pool.execute(
      'INSERT INTO usuarios (correo_electronico, contrasena, rol_id) VALUES (?, ?, ?)',
      [correo_electronico, contrasenaHasheada, 2] // Rol 2 = usuario
    );

    res.status(201).json({ success: true, message: 'Usuario registrado con éxito.', userId: resultado.insertId });
  } catch (error) {
    console.error('Error en /api/register:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.nombre, u.apellido_paterno, u.apellido_materno, u.correo_electronico, u.contrasena, r.nombre AS rol, u.esta_activo
       FROM usuarios u JOIN roles r ON u.rol_id = r.id
       WHERE u.correo_electronico = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
    }

    const user = rows[0];
    if (!user.esta_activo) {
      return res.status(403).json({ success: false, message: 'Usuario inactivo.' });
    }

    const contrasenaValida = await bcrypt.compare(password, user.contrasena);
    if (!contrasenaValida) {
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
    }

    const secretKey = process.env.JWT_SECRET;
    const token = jwt.sign({ userId: user.id, rol: user.rol }, secretKey, { expiresIn: '8h' });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido_paterno: user.apellido_paterno,
        apellido_materno: user.apellido_materno,
        correo_electronico: user.correo_electronico,
        rol: user.rol
      }
    });
  } catch (err) {
    console.error('Error en /api/login:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
});

// =================================================================
// RUTAS DE GESTIÓN (APIARIOS, COLMENAS)
// =================================================================

app.get('/api/apiarios', verificarToken, async (req, res) => {
  try {
    const userId = req.usuario.userId;
    const [apiarios] = await pool.execute(
      `SELECT a.id, a.nombre, a.descripcion_general, a.direccion_o_coordenadas, a.fecha_creacion
       FROM apiarios a
       JOIN usuarios_apiarios ua ON a.id = ua.apiario_id
       WHERE ua.usuario_id = ?
       ORDER BY a.nombre ASC`,
      [userId]
    );
    res.json({ success: true, apiarios });
  } catch (err) {
    console.error('Error en GET /api/apiarios:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor al obtener apiarios.' });
  }
});

// Obtener las colmenas de un apiario específico
app.get('/api/apiarios/:apiarioId/colmenas', verificarToken, async (req, res) => {
  const userId = req.usuario.userId;
  const { apiarioId } = req.params;

  try {
    // 1. Verificación de seguridad: ¿Tiene el usuario acceso a este apiario?
    const [permisos] = await pool.execute(
      'SELECT * FROM usuarios_apiarios WHERE usuario_id = ? AND apiario_id = ?',
      [userId, apiarioId]
    );

    if (permisos.length === 0) {
      // Si no hay un registro que vincule al usuario con el apiario, no tiene permiso.
      return res.status(403).json({ success: false, message: 'Acceso denegado a este apiario.' });
    }

    // 2. Si tiene permiso, obtener las colmenas de ese apiario.
    const [colmenas] = await pool.execute(
      'SELECT id, nombre, descripcion_especifica, fecha_creacion FROM colmenas WHERE apiario_id = ? ORDER BY nombre ASC',
      [apiarioId]
    );

    res.json({ success: true, colmenas });

  } catch (err) {
    console.error(`Error en GET /api/apiarios/${apiarioId}/colmenas:`, err);
    res.status(500).json({ success: false, message: 'Error interno del servidor al obtener las colmenas.' });
  }
});

app.put('/api/profile', verificarToken, async (req, res) => {
  const userId = req.usuario.userId;
  const { nombre = '', apellido_paterno = '', apellido_materno = '' } = req.body;

  if (typeof nombre !== 'string' || nombre.trim() === '') {
    return res.status(400).json({ success: false, message: 'El campo nombre es requerido.' });
  }

  try {
    const [result] = await pool.execute(
      'UPDATE usuarios SET nombre = ?, apellido_paterno = ?, apellido_materno = ? WHERE id = ?',
      [nombre.trim(), apellido_paterno.trim(), apellido_materno.trim(), userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    res.json({ success: true, message: 'Perfil actualizado correctamente.' });
  } catch (error) {
    console.error('Error al actualizar el perfil en la base de datos:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor al actualizar el perfil.' });
  }
});

// =================================================================
// ENDPOINT PARA RECEPCIÓN DE DATOS DE SENSORES (ESP32)
// =================================================================

app.post('/api/lecturas', async (req, res) => {
  const { macAddress, temperatura, humedad, peso, lluvia, sonido } = req.body;

  if (!macAddress) {
    return res.status(400).json({ success: false, message: 'Falta el campo macAddress.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    let sensorId;
    let isNewSensor = false;

    const [sensores] = await connection.execute('SELECT id, estado FROM sensores WHERE mac_address = ?', [macAddress]);

    if (sensores.length > 0) {
      const sensor = sensores[0];
      if (sensor.estado !== 'activo') {
        throw new Error(`El sensor con MAC ${macAddress} no está activo (estado: ${sensor.estado}).`);
      }
      sensorId = sensor.id;
    } else {
      isNewSensor = true;
      console.log(`AUTO-REGISTRO: Nuevo sensor detectado con MAC: ${macAddress}`);
      const [result] = await connection.execute(
        "INSERT INTO sensores (mac_address, estado, fecha_instalacion) VALUES (?, 'no_asignado', NOW())",
        [macAddress]
      );
      sensorId = result.insertId;
    }

    await connection.execute(
      `INSERT INTO lecturas_ambientales (sensor_id, temperatura, humedad, peso, sonido, lluvia) VALUES (?, ?, ?, ?, ?, ?)`,
      [sensorId, temperatura, humedad, peso, sonido, lluvia]
    );

    await connection.execute('UPDATE sensores SET ultima_lectura_en = NOW() WHERE id = ?', [sensorId]);

    await connection.commit();

    const message = isNewSensor
      ? 'Nuevo sensor registrado y primera lectura guardada con éxito.'
      : 'Lectura registrada con éxito.';

    res.status(201).json({ success: true, message, sensorId });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error(`Error procesando lectura de MAC ${macAddress}:`, err.message);
    const statusCode = err.message.includes('no está activo') ? 403 : 500;
    res.status(statusCode).json({ success: false, message: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// =================================================================
// ENDPOINT DE NOTICIAS
// =================================================================

app.get('/api/noticias', verificarToken, async (req, res) => {
  try {
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) {
      console.error('La clave de API para noticias (NEWS_API_KEY) no está configurada en el archivo .env');
      return res.status(500).json({ message: 'Error de configuración del servidor: falta la clave de API de noticias.' });
    }

    // Búsqueda más precisa: solo en títulos y con términos más específicos.
    const query = 'apicultura OR abejas OR colmenas OR "producción de miel" OR apicultor OR polinización';
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&searchIn=title&language=es&sortBy=publishedAt&apiKey=${apiKey}`;

    const response = await axios.get(url);

    const articles = response.data.articles
      .filter(article => article.title && article.title !== "[Removed]")
      .slice(0, 10);

    res.json({ articles });

  } catch (error) {
    if (error.response) {
      console.error('Error al obtener noticias desde la API:', error.response.data);
      res.status(error.response.status).json({ message: `Error del servicio de noticias: ${error.response.data.message}` });
    } else if (error.request) {
      console.error('No se recibió respuesta del servicio de noticias:', error.request);
      res.status(503).json({ message: 'El servicio de noticias no responde.' });
    } else {
      console.error('Error al configurar la solicitud de noticias:', error.message);
      res.status(500).json({ message: 'Error interno al procesar la solicitud de noticias.' });
    }
  }
});

// --- Arranque del Servidor ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API de AbejaNet escuchando en http://0.0.0.0:${PORT}`);
});
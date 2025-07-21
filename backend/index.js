import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import axios from 'axios'; // ÚNICA importación de axios
import { Expo } from 'expo-server-sdk';

// Carga variables de entorno desde .env
dotenv.config();

const app = express();
const expo = new Expo(); // Instancia de Expo

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
    if (err) {
      if (err.name === 'TokenExpiredError') {
        // Si el token ha expirado, enviamos 401 para que el cliente fuerce el re-login.
        return res.status(401).json({ success: false, message: 'Token expirado. Por favor, inicie sesión de nuevo.' });
      }
      // Para cualquier otro error (token malformado, firma inválida), enviamos 403.
      return res.status(403).json({ success: false, message: 'Token inválido o no autorizado.' });
    }
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

// Endpoint para guardar el token de notificación push
app.post('/api/save-push-token', verificarToken, async (req, res) => {
  const { token } = req.body;
  const idUsuario = req.usuario.userId; // Obtenido del middleware verificarToken (el payload del token usa 'userId')

  if (!token) {
    return res.status(400).json({ mensaje: 'No se proporcionó ningún token.' });
  }

  if (!Expo.isExpoPushToken(token)) {
    console.error(`Push token no válido recibido del usuario ${idUsuario}: ${token}`);
    return res.status(400).json({ mensaje: 'El token proporcionado no es válido.' });
  }

  try {
    const [results] = await pool.execute(
      'UPDATE usuarios SET push_token = ? WHERE id = ?',
      [token, idUsuario]
    );

    if (results.affectedRows > 0) {
      console.log(`Token de notificaciones actualizado para el usuario ${idUsuario}`);
      res.json({ mensaje: 'Token guardado correctamente.' });
    } else {
      res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }
  } catch (error) {
    console.error('Error al guardar el token en la base de datos:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
});


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
    const token = jwt.sign({ userId: user.id, rol: user.rol }, secretKey, { expiresIn: '1h' }); // Expiración de 1 hora para producción

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

// Endpoint para obtener un resumen de datos para el dashboard
app.get('/api/dashboard-summary', verificarToken, async (req, res) => {
  const { userId } = req.usuario; // Solo necesitamos el userId, el rol es siempre 'usuario' en este contexto

  try {
    const query = `
      SELECT
        (SELECT COUNT(*) FROM usuarios_apiarios WHERE usuario_id = ?) AS apiariosCount,
        (SELECT COUNT(c.id) FROM colmenas c JOIN usuarios_apiarios ua ON c.apiario_id = ua.apiario_id WHERE ua.usuario_id = ?) AS colmenasCount,
        (SELECT COUNT(a.id) FROM alertas a JOIN colmenas c ON a.colmena_id = c.id JOIN usuarios_apiarios ua ON c.apiario_id = ua.apiario_id WHERE ua.usuario_id = ? AND a.leida = FALSE) AS alertasCount;
    `;
    const params = [userId, userId, userId];

    const [summary] = await pool.execute(query, params);
    res.json({ success: true, summary: summary[0] });

  } catch (err) {
    console.error('Error en GET /api/dashboard-summary:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor al obtener el resumen.' });
  }
});

// Endpoint para marcar todas las alertas de un usuario como leídas
app.post('/api/alertas/marcar-como-leidas', verificarToken, async (req, res) => {
  const { userId } = req.usuario; // El rol es siempre 'usuario'

  try {
    const query = `
      UPDATE alertas a
      JOIN colmenas c ON a.colmena_id = c.id
      JOIN usuarios_apiarios ua ON c.apiario_id = ua.apiario_id
      SET a.leida = TRUE
      WHERE ua.usuario_id = ? AND a.leida = FALSE;
    `;
    const params = [userId];

    const [result] = await pool.execute(query, params);
    console.log(`Usuario ${userId} ha marcado ${result.affectedRows} alertas como leídas.`);
    res.status(200).json({ message: `${result.affectedRows} alertas marcadas como leídas.` });

  } catch (err) {
    console.error('Error al marcar alertas como leídas:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.get('/api/apiarios', verificarToken, async (req, res) => {
  const userId = req.usuario.userId;
  try {
    const [apiarios] = await pool.execute(
      `SELECT a.id, a.nombre, a.descripcion_general, a.direccion_o_coordenadas 
       FROM apiarios a
       JOIN usuarios_apiarios ua ON a.id = ua.apiario_id
       WHERE ua.usuario_id = ?`,
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
      'SELECT usuario_id FROM usuarios_apiarios WHERE usuario_id = ? AND apiario_id = ?',
      [userId, apiarioId]
    );

    if (permisos.length === 0) {
      return res.status(403).json({ success: false, message: 'Acceso no autorizado a este apiario.' });
    }

    // 2. Si tiene acceso, obtener las colmenas
    const [colmenas] = await pool.execute(
      'SELECT id, nombre, descripcion_especifica FROM colmenas WHERE apiario_id = ?',
      [apiarioId]
    );
    res.json({ success: true, colmenas });

  } catch (err) {
    console.error(`Error en GET /api/apiarios/${apiarioId}/colmenas:`, err);
    res.status(500).json({ success: false, message: 'Error interno del servidor al obtener las colmenas.' });
  }
});

// Obtener todas las lecturas de una colmena específica
app.get('/api/colmenas/:colmenaId/lecturas', verificarToken, async (req, res) => {
  const { colmenaId } = req.params;
  const { range = 'day' } = req.query; // Default to 'day'
  const userId = req.usuario.userId;

  try {
    // 1. Verificación de seguridad
    const [permisos] = await pool.execute(
      `SELECT ua.usuario_id FROM usuarios_apiarios ua JOIN colmenas c ON ua.apiario_id = c.apiario_id WHERE ua.usuario_id = ? AND c.id = ?`,
      [userId, colmenaId]
    );
    if (permisos.length === 0) {
      return res.status(403).json({ success: false, message: 'Acceso no autorizado a esta colmena.' });
    }

    // 2. Construcción de la consulta según el rango
    let query;
    const params = [colmenaId];

    switch (range) {
      case 'month':
        // Para el mes, agrupa por semana y calcula el promedio semanal
        query = `SELECT 
                   STR_TO_DATE(CONCAT(YEARWEEK(l.fecha_registro, 1), ' Monday'), '%x%v %W') as fecha_registro,
                   AVG(l.temperatura) as temperatura,
                   AVG(l.humedad) as humedad,
                   AVG(l.peso) as peso,
                   AVG(l.sonido) as sonido
                 FROM lecturas_ambientales l
                 JOIN sensores s ON l.sensor_id = s.id
                 WHERE s.colmena_id = ? AND l.fecha_registro >= NOW() - INTERVAL 1 MONTH
                 GROUP BY YEARWEEK(l.fecha_registro, 1)
                 ORDER BY fecha_registro ASC`;
        break;
      case 'week':
        // Para la semana, agrupa por día y calcula el promedio diario
        query = `SELECT 
                   DATE(l.fecha_registro) as fecha_registro,
                   AVG(l.temperatura) as temperatura,
                   AVG(l.humedad) as humedad,
                   AVG(l.peso) as peso,
                   AVG(l.sonido) as sonido
                 FROM lecturas_ambientales l
                 JOIN sensores s ON l.sensor_id = s.id
                 WHERE s.colmena_id = ? AND l.fecha_registro >= NOW() - INTERVAL 1 WEEK
                 GROUP BY DATE(l.fecha_registro)
                 ORDER BY fecha_registro ASC`;
        break;
      default: // 'day'
        // Para el día, agrupa por bloques de 2 horas y calcula el promedio (versión corregida)
        query = `SELECT 
                   -- Construye una marca de tiempo representativa para el bloque de 2 horas
                   CONCAT(DATE(l.fecha_registro), ' ', LPAD(FLOOR(HOUR(l.fecha_registro) / 2) * 2, 2, '0'), ':00:00') AS fecha_registro,
                   AVG(l.temperatura) as temperatura,
                   AVG(l.humedad) as humedad,
                   AVG(l.peso) as peso,
                   AVG(l.sonido) as sonido
                 FROM lecturas_ambientales l
                 JOIN sensores s ON l.sensor_id = s.id
                 WHERE s.colmena_id = ? AND l.fecha_registro >= NOW() - INTERVAL 1 DAY
                 -- Agrupa por el día y el bloque de 2 horas para garantizar el correcto funcionamiento
                 GROUP BY DATE(l.fecha_registro), FLOOR(HOUR(l.fecha_registro) / 2)
                 ORDER BY fecha_registro ASC`;
        break;
    }

    const [lecturas] = await pool.execute(query, params);
    res.json({ success: true, lecturas });

  } catch (err) {
    console.error(`Error en GET /api/colmenas/${colmenaId}/lecturas:`, err);
    res.status(500).json({ success: false, message: 'Error interno del servidor al obtener las lecturas.' });
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
    // Búsqueda más precisa, excluyendo términos que generan ruido (política, social, etc.)
    const query = '(apicultura OR abejas OR colmenas OR "producción de miel" OR apicultor OR polinización) NOT (Acteal OR política OR fábula OR izquierda OR corrupción)';
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

// ==============================================
// ENDPOINT PARA GESTIÓN DE ALERTAS
// ==============================================

// NOTA: Este endpoint es para que los sensores (ESP32) reporten eventos críticos.
// En un futuro, debería tener su propio sistema de autenticación (ej. API Key por dispositivo)
// en lugar de depender del token de usuario, pero para la fase inicial lo dejamos así.
app.get('/api/alertas', verificarToken, async (req, res) => {
  const userId = req.usuario.userId;

  try {
    const query = `
      SELECT a.*, c.nombre AS nombre_colmena, ap.nombre AS nombre_apiario
      FROM alertas a
      JOIN colmenas c ON a.colmena_id = c.id
      JOIN apiarios ap ON c.apiario_id = ap.id
      JOIN usuarios_apiarios ua ON ap.id = ua.apiario_id
      WHERE ua.usuario_id = ?
      ORDER BY a.fecha_alerta DESC
    `;
    const [alertas] = await pool.execute(query, [userId]);
    res.json(alertas);
  } catch (error) {
    console.error('Error al obtener las alertas:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener las alertas.' });
  }
});

app.post('/api/alertas', async (req, res) => {
  const { colmena_id, tipo_alerta, valor_registrado, mensaje } = req.body;

  if (!colmena_id || !tipo_alerta || !mensaje) {
    return res.status(400).json({ error: 'Faltan campos requeridos: colmena_id, tipo_alerta, mensaje.' });
  }

  try {
    // 1. Insertar la alerta en la base de datos, estableciendo explícitamente leida = FALSE
    const query = 'INSERT INTO alertas (colmena_id, tipo_alerta, valor_registrado, mensaje, leida) VALUES (?, ?, ?, ?, FALSE)';
    await pool.execute(query, [colmena_id, tipo_alerta, valor_registrado, mensaje]);

    // --- INICIO: LÓGICA DE ENVÍO DE NOTIFICACIONES ---

    // 2. Obtener los tokens de los usuarios asociados a la colmena de la alerta
    const [usuarios] = await pool.execute(`
      SELECT u.push_token
      FROM usuarios u
      JOIN usuarios_apiarios ua ON u.id = ua.usuario_id
      JOIN colmenas c ON ua.apiario_id = c.apiario_id
      WHERE c.id = ? AND u.push_token IS NOT NULL
    `, [colmena_id]);

    const tokens = usuarios.map(u => u.push_token).filter(t => Expo.isExpoPushToken(t));

    if (tokens.length > 0) {
      console.log(`Enviando notificaciones a ${tokens.length} dispositivo(s) para la alerta: ${tipo_alerta}`);
      
      // 3. Construir los mensajes
      const messages = tokens.map(token => ({
        to: token,
        sound: 'default',
        title: `🚨 Alerta en AbejaNet: ${tipo_alerta}`,
        body: mensaje,
        channelId: 'default', // ¡IMPORTANTE! Asegura que use el canal correcto en Android
        data: { colmenaId: colmena_id }, // Dato extra para dirigir al usuario en la app
      }));

      // 4. Enviar los mensajes en lotes
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          await expo.sendPushNotificationsAsync(chunk);
        } catch (error) {
          console.error('Error al enviar un lote de notificaciones:', error);
        }
      }
    }
    // --- FIN: LÓGICA DE ENVÍO DE NOTIFICACIONES ---

    res.status(201).json({ success: true, message: 'Alerta registrada y notificaciones enviadas.' });
  } catch (error) {
    console.error('Error al registrar la alerta:', error);
    res.status(500).json({ error: 'Error interno del servidor al registrar la alerta.' });
  }
});

// --- Arranque del Servidor ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API de AbejaNet escuchando en http://0.0.0.0:${PORT}`);
});
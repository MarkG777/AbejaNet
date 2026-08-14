import axios from 'axios';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';
import { Expo } from 'expo-server-sdk';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import asignarUsuariosAApiario from './assign_users.js';
import pool from './db.js';
import generarDatos from './generate_mock_data.js';
import { verificarApiKey, verificarSetupSecret, verificarToken } from './middleware/auth.js';
import enviarNotificacionPrueba from './test_notification.js';

// Almacenamiento temporal de códigos de reseteo de contraseña
// Formato: { email: { code, expiresAt } }
const resetCodes = new Map();

// Carga variables de entorno desde .env
dotenv.config();

// Variables de entorno requeridas para que el servidor pueda operar de forma segura
const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  console.error(`Faltan variables de entorno requeridas: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const app = express();
const expo = new Expo(); // Instancia de Expo
const googleClient = new OAuth2Client();

// La app móvil (axios) no envía cabecera Origin, así que siempre se permite.
// Solo se restringen los orígenes de navegador (builds web, herramientas de desarrollo).
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8081,http://localhost:19006,https://abejanet-backend.onrender.com')
  .split(',')
  .map((origin) => origin.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('No permitido por la política de CORS.'));
  },
}));
app.use(express.json());

// Limita intentos repetidos en rutas sensibles a fuerza bruta
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos. Intenta de nuevo en unos minutos.' },
});

// =================================================================
// RUTAS DE TEST Y SALUD
// =================================================================
app.get('/', (req, res) => res.send('API de AbejaNet online.'));

// MIGRACIONES AUTOMÁTICAS AL INICIAR
(async () => {
  try {
    await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS refresh_token TEXT;');
    await pool.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS proveedor_auth VARCHAR(20) DEFAULT 'local';");
    // Crear tabla bitácora si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bitacora (
        id SERIAL PRIMARY KEY,
        usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
        apiario_id INT REFERENCES apiarios(id) ON DELETE CASCADE,
        fecha DATE NOT NULL DEFAULT CURRENT_DATE,
        tipo_evento VARCHAR(50) NOT NULL,
        descripcion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Columna colmena_id (opcional) para bitácora, agregada en v5 pero faltante en la tabla ya existente
    await pool.query('ALTER TABLE bitacora ADD COLUMN IF NOT EXISTS colmena_id INT REFERENCES colmenas(id) ON DELETE SET NULL;');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_bitacora_colmena ON bitacora(colmena_id);');
    console.log('Migraciones automáticas aplicadas correctamente.');
  } catch (err) {
    console.error('Error en migraciones automáticas:', err.message);
  }
})();

app.get('/test-db', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, message: 'Conexión a la base de datos exitosa.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al conectar con la base de datos.', error: err.message });
  }
});

// Endpoint temporal para ver datos en la DB
app.get('/debug/data', verificarSetupSecret, async (req, res) => {
  try {
    const roles = await pool.query('SELECT COUNT(*) as total FROM roles');
    const usuarios = await pool.query('SELECT COUNT(*) as total FROM usuarios');
    const apiarios = await pool.query('SELECT COUNT(*) as total FROM apiarios');
    const colmenas = await pool.query('SELECT COUNT(*) as total FROM colmenas');
    const sensores = await pool.query('SELECT COUNT(*) as total FROM sensores');
    const lecturas = await pool.query('SELECT COUNT(*) as total FROM lecturas_ambientales');
    const usuariosApiarios = await pool.query('SELECT COUNT(*) as total FROM usuarios_apiarios');
    
    const allUsuarios = await pool.query('SELECT id, correo_electronico, nombre, rol_id FROM usuarios LIMIT 10');
    const allApiarios = await pool.query('SELECT id, nombre, descripcion_general FROM apiarios LIMIT 10');
    
    res.json({
      totales: {
        roles: roles.rows[0].total,
        usuarios: usuarios.rows[0].total,
        apiarios: apiarios.rows[0].total,
        colmenas: colmenas.rows[0].total,
        sensores: sensores.rows[0].total,
        lecturas_ambientales: lecturas.rows[0].total,
        usuarios_apiarios: usuariosApiarios.rows[0].total
      },
      usuarios: allUsuarios.rows,
      apiarios: allApiarios.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para poblar datos de sensores (llama al módulo generate_mock_data.js)
app.post('/debug/populate-data', verificarSetupSecret, async (req, res) => {
  try {
    // Acepta parámetros opcionales del body para configurar la generación
    // Ejemplo body: { "colmena": "Colmena Alfa Ppal", "mac": "XX:XX:XX:XX:XX:XX", "dias": 15, "lecturasPorHora": 2 }
    // Si no se envía body, usa los valores por defecto del script.
    const opciones = req.body || {};
    console.log('Iniciando generación de datos de sensores con opciones:', JSON.stringify(opciones));
    await generarDatos(false, opciones); // NO cerrar el pool cuando se llama desde aquí
    res.json({ success: true, message: 'Datos generados exitosamente', opciones });
  } catch (error) {
    console.error('Error al generar datos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para asignar usuarios a apiarios (llama al módulo assign_users.js)
app.post('/debug/assign-users', verificarSetupSecret, async (req, res) => {
  try {
    // Acepta un array de asignaciones o un solo objeto
    let asignaciones = req.body;
    
    // Si envían un solo objeto, convertirlo a array
    if (!Array.isArray(asignaciones)) {
      asignaciones = [asignaciones];
    }
    
    console.log('Asignando usuarios a apiarios...');
    const resultado = await asignarUsuariosAApiario(asignaciones);
    
    res.json(resultado);
  } catch (error) {
    console.error('Error al asignar usuarios:', error);
    res.status(500).json({ success: false, error: error.message });
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
    const { rowCount } = await pool.query(
      'UPDATE usuarios SET push_token = $1 WHERE id = $2',
      [token, idUsuario]
    );

    if (rowCount > 0) {
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


app.post('/api/register', authLimiter, async (req, res) => {
  const { correo_electronico, contrasena } = req.body;
  if (!correo_electronico || !contrasena) {
    return res.status(400).json({ success: false, message: 'Correo y contraseña son requeridos.' });
  }

  try {
    const { rows: existingUsers } = await pool.query('SELECT id FROM usuarios WHERE correo_electronico = $1', [correo_electronico]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ success: false, message: 'El correo ya está registrado.' });
    }

    const contrasenaHasheada = await bcrypt.hash(contrasena, 10);
    // En PostgreSQL, para obtener el ID del rol de forma segura, hacemos una subconsulta.
    const insertQuery = `
      INSERT INTO usuarios (correo_electronico, contrasena, rol_id)
      VALUES ($1, $2, (SELECT id FROM roles WHERE nombre = 'usuario'))
      RETURNING id;
    `;
    const { rows } = await pool.query(insertQuery, [correo_electronico, contrasenaHasheada]);

    res.status(201).json({ success: true, message: 'Usuario registrado con éxito.', userId: rows[0].id });
  } catch (error) {
    console.error('Error en /api/register:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
});

app.post('/api/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query(
       `SELECT u.id, u.nombre, u.apellido_paterno, u.apellido_materno, u.correo_electronico, u.contrasena, r.nombre AS rol, u.esta_activo
        FROM usuarios u JOIN roles r ON u.rol_id = r.id
       WHERE u.correo_electronico = $1`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
    }

    const user = rows[0];
    if (!user.esta_activo) {
      return res.status(403).json({ success: false, message: 'La cuenta de usuario está inactiva.' });
    }

    // Verificación NUEVA: Asegurarse de que el usuario tenga una contraseña (no es un usuario de Google)
    if (!user.contrasena) {
      return res.status(401).json({ success: false, message: 'Esta cuenta fue registrada con Google. Por favor, inicie sesión con Google.' });
    }

    const contrasenaValida = await bcrypt.compare(password, user.contrasena);
    if (!contrasenaValida) {
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
    }

    const secretKey = process.env.JWT_SECRET;
    const token = jwt.sign({ userId: user.id, rol: user.rol }, secretKey, { expiresIn: '1h' }); // Expiración de 1 hora
    // NUEVO: Llave Maestra (Fase 2.4 - Tokens Persistentes Mobile)
    const refreshToken = jwt.sign({ userId: user.id, rol: user.rol }, secretKey, { expiresIn: '7d' });
    
    // Anclar Llave Maestra en BD de forma tolerante a errores temporales
    try {
      await pool.query('UPDATE usuarios SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);
    } catch(dbErr) {
      console.warn("Advertencia DB: No se pudo guardar refresh_token. ", dbErr.message);
    }

    res.json({
      success: true,
      token,
      refreshToken, // Token fantasma (Web lo ignorará según Ley Postel)
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
// ENDPOINT PARA RENOVAR TOKEN (Fase 2.4 - Mobile Persistent Sessions)
// =================================================================
app.post('/api/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ success: false, message: 'Falta Refresh Token' });

  try {
    // 1. Verificar firma encriptada JWT
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    // 2. Comprobar que el token exista y siga vigente en BD (Mitigación robo de tokens)
    const { rows } = await pool.query('SELECT id, rol, refresh_token, esta_activo FROM usuarios WHERE id = $1', [decoded.userId]);
    if (rows.length === 0 || rows[0].refresh_token !== refreshToken || !rows[0].esta_activo) {
      return res.status(403).json({ success: false, message: 'Refresh Token revocado/inválido' });
    }

    const secretKey = process.env.JWT_SECRET;
    // 3. Fabricar par de llaves nuevas
    const newToken = jwt.sign({ userId: rows[0].id, rol: rows[0].rol }, secretKey, { expiresIn: '1h' });
    const newRefreshToken = jwt.sign({ userId: rows[0].id, rol: rows[0].rol }, secretKey, { expiresIn: '7d' });

    // 4. Rotación de llave maestra
    await pool.query('UPDATE usuarios SET refresh_token = $1 WHERE id = $2', [newRefreshToken, rows[0].id]);

    res.json({ success: true, token: newToken, refreshToken: newRefreshToken });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'El periodo extendido de 7 días expiró. Vuelva a Iniciar Sesión.' });
    }
    return res.status(403).json({ success: false, message: 'Refresh token corrupto.' });
  }
});

app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, message: 'No se proporcionó el token de Google.' });
  }

  // Lista de Client IDs válidos de tus variables de entorno
  const validClients = [
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID_DEBUG
  ].filter(Boolean); // Filtra por si alguna variable no está definida

  try {
    // 1. Verificar el token de Google de forma segura y dinámica
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
    });

    const payload = ticket.getPayload();
    const tokenAudience = payload.aud;

    if (!validClients.includes(tokenAudience)) {
      // Lanzamos un error específico para que el bloque catch lo identifique.
      throw new Error(`Wrong recipient: la audiencia del token (${tokenAudience}) no está en la lista de clientes autorizados.`);
    }
    const { email, name, given_name, family_name } = payload;

    if (!email) {
      return res.status(400).json({ success: false, message: 'El token de Google no contenía un correo electrónico.' });
    }

    // 2. Buscar o crear el usuario en la base de datos
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let { rows: users } = await client.query('SELECT u.id, u.nombre, u.apellido_paterno, u.apellido_materno, u.correo_electronico, r.nombre AS rol FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE u.correo_electronico = $1', [email]);
      let user = users[0];

      if (!user) {
        // El usuario no existe, lo creamos. Usamos RETURNING para obtener los datos del nuevo usuario directamente.
        const insertQuery = `
          INSERT INTO usuarios (correo_electronico, nombre, apellido_paterno, apellido_materno, rol_id)
          VALUES ($1, $2, $3, $4, (SELECT id FROM roles WHERE nombre = 'usuario'))
          RETURNING id, nombre, apellido_paterno, apellido_materno, correo_electronico, (SELECT nombre FROM roles WHERE id = rol_id) as rol;
        `;
        const { rows: newUsers } = await client.query(insertQuery, [email, given_name || name, family_name || '', '']);
        user = newUsers[0];
      }

      await client.query('COMMIT');

      // 3. Crear y firmar el token JWT de nuestra aplicación
      const secretKey = process.env.JWT_SECRET;
      const appToken = jwt.sign(
        { userId: user.id, rol: user.rol },
        secretKey,
        { expiresIn: '1h' } // Estandarizado a 1h
      );
      // Fabricar la Llave Maestra también para Logins Sociales
      const refreshToken = jwt.sign({ userId: user.id, rol: user.rol }, secretKey, { expiresIn: '7d' });
      
      try {
        await client.query('UPDATE usuarios SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);
      } catch(dbErr) {}

      res.json({
        success: true,
        token: appToken,
        refreshToken, // Añadido dinámico
        user: {
          id: user.id,
          nombre: user.nombre,
          apellido_paterno: user.apellido_paterno,
          apellido_materno: user.apellido_materno,
          correo_electronico: user.correo_electronico,
          rol: user.rol
        }
      });

    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError; // Lanza el error para que sea capturado por el catch exterior
    } finally {
      client.release();
    }

  } catch (err) {
    // Si el error es por una audiencia incorrecta, lo capturamos para depurar.
    if (err.message.includes('Wrong recipient')) {
      const decodedToken = jwt.decode(token);
      const audienceInToken = decodedToken?.aud || 'No se pudo decodificar la audiencia del token.';
      
      console.error(`[AUTH DEBUG] Fallo de audiencia en Google Sign-In.`);
      console.error(`[AUTH DEBUG] Audience en el token recibido: ${audienceInToken}`);
      console.error(`[AUTH DEBUG] Client IDs válidos configurados en Render: ${JSON.stringify(validClients)}`);

      return res.status(401).json({ 
        success: false, 
        message: `Error de autenticación: El token de la app no coincide con los Client IDs del servidor. Audience en token: ${audienceInToken}` 
      });
    }

    // Para cualquier otro tipo de error.
    console.error('Error inesperado en /api/auth/google:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor durante la autenticación con Google.' });
  }
});

// =================================================================
// RUTAS DE GESTIÓN (APIARIOS, COLMENAS)
// =================================================================

// Endpoint para obtener un resumen de datos para el dashboard
// =================================================================
// ENDPOINT PARA RECEPCIÓN DE DATOS DE SENSORES (ESP32)
// =================================================================
app.post('/api/sensor-data', verificarApiKey, async (req, res) => {
  const { mac_address, temperatura, humedad, peso, sonido, lluvia } = req.body;

  if (!mac_address) {
    return res.status(400).json({ success: false, message: 'La mac_address es obligatoria.' });
  }

  const client = await pool.connect();
  try {
    // 1. Buscar el sensor por MAC. Si no existe, crearlo. Si existe, verificar su estado.
    let sensorResult = await client.query('SELECT id, estado FROM sensores WHERE mac_address = $1', [mac_address]);
    let sensorId;

    if (sensorResult.rows.length === 0) {
      // Sensor no encontrado, lo registramos como 'no_asignado'.
      const newSensorResult = await client.query(
        'INSERT INTO sensores (mac_address, estado) VALUES ($1, $2) RETURNING id',
        [mac_address, 'no_asignado']
      );
      sensorId = newSensorResult.rows[0].id;
      console.log(`[INFO] Nuevo sensor auto-registrado con MAC: ${mac_address} y ID: ${sensorId}`);
    } else {
      // El sensor ya existe, verificamos su estado.
      const sensor = sensorResult.rows[0];
      if (sensor.estado === 'inactivo' || sensor.estado === 'mantenimiento') {
        // Si el sensor está inactivo o en mantenimiento, rechazamos la lectura.
        return res.status(403).json({ 
          success: false, 
          message: `El sensor con MAC ${mac_address} está actualmente '${sensor.estado}' y no puede registrar datos.` 
        });
      }
      sensorId = sensor.id;
    }

    // 2. Insertar la nueva lectura ambiental
    await client.query(
      `INSERT INTO lecturas_ambientales (sensor_id, humedad, temperatura, peso, sonido, lluvia)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sensorId, humedad, temperatura, peso, sonido, lluvia]
    );

    // 3. Actualizar la fecha de última lectura en la tabla de sensores
    await client.query('UPDATE sensores SET ultima_lectura_en = CURRENT_TIMESTAMP WHERE id = $1', [sensorId]);

    res.status(201).json({ success: true, message: 'Datos del sensor recibidos y guardados correctamente.' });

  } catch (err) {
    console.error('Error en /api/sensor-data:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor al procesar los datos del sensor.' });
  } finally {
    client.release();
  }
});


app.get('/api/dashboard-summary', verificarToken, async (req, res) => {
  const { userId } = req.usuario;

  try {
    const query = `
      SELECT
        (SELECT COUNT(*) FROM usuarios_apiarios WHERE usuario_id = $1) AS "apiariosCount",
        (SELECT COUNT(c.id) FROM colmenas c JOIN usuarios_apiarios ua ON c.apiario_id = ua.apiario_id WHERE ua.usuario_id = $2) AS "colmenasCount",
        (SELECT COUNT(a.id) FROM alertas a JOIN colmenas c ON a.colmena_id = c.id JOIN usuarios_apiarios ua ON c.apiario_id = ua.apiario_id WHERE ua.usuario_id = $3 AND a.leida = FALSE) AS "alertasCount";
    `;
    const params = [userId, userId, userId];

    const { rows: summary } = await pool.query(query, params);
    res.json({ success: true, summary: summary[0] });

  } catch (err) {
    console.error('Error en GET /api/dashboard-summary:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor al obtener el resumen.' });
  }
});

app.get('/api/apiarios', verificarToken, async (req, res) => {
  const userId = req.usuario.userId;
  const userRol = req.usuario.rol;
  try {
    let apiarios;
    if (userRol === 'administrador') {
      // Los admin ven todos los apiarios
      const result = await pool.query(
        `SELECT a.id, a.nombre, a.descripcion_general, a.direccion_o_coordenadas 
         FROM apiarios a ORDER BY a.nombre`);
      apiarios = result.rows;
    } else {
      const result = await pool.query(
         `SELECT a.id, a.nombre, a.descripcion_general, a.direccion_o_coordenadas 
          FROM apiarios a
          JOIN usuarios_apiarios ua ON a.id = ua.apiario_id
         WHERE ua.usuario_id = $1`,
        [userId]
      );
      apiarios = result.rows;
    }
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
    if (req.usuario.rol !== 'administrador') {
      const { rows: permisos } = await pool.query(
        'SELECT usuario_id FROM usuarios_apiarios WHERE usuario_id = $1 AND apiario_id = $2',
        [userId, apiarioId]
      );

      if (permisos.length === 0) {
        return res.status(403).json({ success: false, message: 'Acceso no autorizado a este apiario.' });
      }
    }

    // 2. Si tiene acceso, obtener las colmenas
    const { rows: colmenas } = await pool.query(
      'SELECT id, nombre, descripcion_especifica FROM colmenas WHERE apiario_id = $1',
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
    const { rows: permisos } = await pool.query(
      `SELECT ua.usuario_id FROM usuarios_apiarios ua JOIN colmenas c ON ua.apiario_id = c.apiario_id WHERE ua.usuario_id = $1 AND c.id = $2`,
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
                   date_trunc('week', l.fecha_registro) as fecha_registro,
                   AVG(l.temperatura) as temperatura,
                   AVG(l.humedad) as humedad,
                   AVG(l.peso) as peso,
                   AVG(l.sonido) as sonido
                 FROM lecturas_ambientales l
                 JOIN sensores s ON l.sensor_id = s.id
                 WHERE s.colmena_id = $1 AND l.fecha_registro >= NOW() - INTERVAL '1 MONTH'
                 GROUP BY date_trunc('week', l.fecha_registro)
                 ORDER BY fecha_registro ASC`;
        break;
      case 'week':
        // Para la semana, agrupa por día y calcula el promedio diario
        query = `SELECT 
                   l.fecha_registro::date as fecha_registro,
                   AVG(l.temperatura) as temperatura,
                   AVG(l.humedad) as humedad,
                   AVG(l.peso) as peso,
                   AVG(l.sonido) as sonido
                 FROM lecturas_ambientales l
                 JOIN sensores s ON l.sensor_id = s.id
                 WHERE s.colmena_id = $1 AND l.fecha_registro >= NOW() - INTERVAL '1 WEEK'
                 GROUP BY l.fecha_registro::date
                 ORDER BY fecha_registro ASC`;
        break;
      default: // 'day'
        // Para el día, agrupa por hora y calcula el promedio
        query = `SELECT 
                   date_trunc('hour', l.fecha_registro) as fecha_registro,
                   AVG(l.temperatura) as temperatura,
                   AVG(l.humedad) as humedad,
                   AVG(l.peso) as peso,
                   AVG(l.sonido) as sonido
                 FROM lecturas_ambientales l
                 JOIN sensores s ON l.sensor_id = s.id
                 WHERE s.colmena_id = $1 AND l.fecha_registro >= NOW() - INTERVAL '1 DAY'
                 GROUP BY fecha_registro
                 ORDER BY fecha_registro ASC`;
        break;
    }

    const { rows: lecturas } = await pool.query(query, params);
    res.json({ success: true, lecturas });

  } catch (err) {
    console.error(`Error en GET /api/colmenas/${colmenaId}/lecturas:`, err);
    res.status(500).json({ success: false, message: 'Error interno del servidor al obtener las lecturas.' });
  }
});

// Obtener la última lectura cruda (sin promediar) de una colmena
app.get('/api/colmenas/:colmenaId/ultima-lectura', verificarToken, async (req, res) => {
  const { colmenaId } = req.params;
  const userId = req.usuario.userId;

  try {
    const { rows: permisos } = await pool.query(
      `SELECT ua.usuario_id FROM usuarios_apiarios ua JOIN colmenas c ON ua.apiario_id = c.apiario_id WHERE ua.usuario_id = $1 AND c.id = $2`,
      [userId, colmenaId]
    );
    if (permisos.length === 0) {
      return res.status(403).json({ success: false, message: 'Acceso no autorizado.' });
    }

    const { rows } = await pool.query(
      `SELECT l.temperatura, l.humedad, l.peso, l.sonido, l.lluvia, l.fecha_registro
       FROM lecturas_ambientales l
       JOIN sensores s ON l.sensor_id = s.id
       WHERE s.colmena_id = $1
       ORDER BY l.fecha_registro DESC
       LIMIT 1`,
      [colmenaId]
    );

    if (rows.length === 0) {
      return res.json({ success: true, lectura: null });
    }

    res.json({ success: true, lectura: rows[0] });
  } catch (err) {
    console.error(`Error en GET /api/colmenas/${colmenaId}/ultima-lectura:`, err);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
});

app.put('/api/profile', verificarToken, async (req, res) => {
  const userId = req.usuario.userId;
  const { nombre = '', apellido_paterno = '', apellido_materno = '' } = req.body;

  if (typeof nombre !== 'string' || nombre.trim() === '') {
    return res.status(400).json({ success: false, message: 'El campo nombre es requerido.' });
  }

  try {
    const { rowCount } = await pool.query(
      'UPDATE usuarios SET nombre = $1, apellido_paterno = $2, apellido_materno = $3 WHERE id = $4',
      [nombre.trim(), apellido_paterno.trim(), apellido_materno.trim(), userId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    res.json({ success: true, message: 'Perfil actualizado correctamente.' });
  } catch (error) {
    console.error('Error al actualizar el perfil en la base de datos:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor al actualizar el perfil.' });
  }
});

app.post('/api/change-password', verificarToken, async (req, res) => {
  const userId = req.usuario.userId;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Se requieren la contraseña actual y la nueva contraseña.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
  }

  try {
    const { rows } = await pool.query('SELECT contrasena FROM usuarios WHERE id = $1', [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const user = rows[0];

    if (!user.contrasena) {
      return res.status(400).json({ success: false, message: 'Las cuentas de Google no pueden cambiar la contraseña desde aquí.' });
    }

    const contrasenaValida = await bcrypt.compare(currentPassword, user.contrasena);
    if (!contrasenaValida) {
      return res.status(401).json({ success: false, message: 'La contraseña actual es incorrecta.' });
    }

    const nuevaContrasenaHasheada = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE usuarios SET contrasena = $1 WHERE id = $2', [nuevaContrasenaHasheada, userId]);

    res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    console.error('Error al cambiar la contraseña:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
});

app.post('/api/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;
  console.log(`[forgot-password] Solicitud recibida para: ${email}`);

  if (!email) {
    console.warn('[forgot-password] Email no proporcionado.');
    return res.status(400).json({ success: false, message: 'El correo electrónico es requerido.' });
  }

  if (!process.env.BREVO_API_KEY) {
    console.error('[forgot-password] ERROR: BREVO_API_KEY no está configurada en las variables de entorno.');
    return res.status(500).json({ success: false, message: 'El servicio de correo no está configurado en el servidor. Contacta al administrador.' });
  }
  console.log('[forgot-password] BREVO_API_KEY detectada correctamente.');

  try {
    const { rows } = await pool.query('SELECT id, contrasena FROM usuarios WHERE correo_electronico = $1', [email]);
    console.log(`[forgot-password] Usuarios encontrados: ${rows.length}`);

    if (rows.length === 0 || !rows[0].contrasena) {
      console.log('[forgot-password] Usuario no encontrado o es cuenta Google. Respuesta silenciosa.');
      return res.json({ success: true, message: 'Si existe una cuenta con ese correo, recibirás un código de verificación.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000;

    resetCodes.set(email.toLowerCase(), { code, expiresAt });
    console.log(`[forgot-password] Código generado para ${email}. Intentando enviar email...`);

    const brevoResponse = await axios.post('https://api.brevo.com/v3/smtp/email', {
      sender: { name: 'AbejaNet', email: process.env.BREVO_SENDER_EMAIL || 'noreply@abejanet.com' },
      to: [{ email }],
      subject: 'Código de recuperación - AbejaNet',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2E7D32; text-align: center;">🐝 AbejaNet</h2>
          <p>Hola,</p>
          <p>Recibimos una solicitud para restablecer tu contraseña. Usa el siguiente código:</p>
          <div style="background: #f5f5f5; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
          </div>
          <p style="color: #666; font-size: 14px;">Este código expira en <strong>15 minutos</strong>.</p>
          <p style="color: #666; font-size: 14px;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px; text-align: center;">AbejaNet - Sistema de Monitoreo Apícola</p>
        </div>
      `,
    }, { headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', 'accept': 'application/json' } });
    console.log('[forgot-password] Brevo API response:', JSON.stringify(brevoResponse.data));

    console.log(`Código de recuperación enviado a ${email}`);
    res.json({ success: true, message: 'Si existe una cuenta con ese correo, recibirás un código de verificación.' });

  } catch (error) {
    if (error.response) {
      console.error('[forgot-password] Brevo API error status:', error.response.status);
      console.error('[forgot-password] Brevo API error data:', JSON.stringify(error.response.data));
    } else {
      console.error('[forgot-password] Error:', error.message);
    }
    res.status(500).json({ success: false, message: 'Error al enviar el correo. Verifica que el correo sea válido e intenta de nuevo.' });
  }
});

app.post('/api/reset-password', authLimiter, async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ success: false, message: 'Correo, código y nueva contraseña son requeridos.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
  }

  const stored = resetCodes.get(email.toLowerCase());

  if (!stored) {
    return res.status(400).json({ success: false, message: 'No hay una solicitud de recuperación activa para este correo.' });
  }

  if (Date.now() > stored.expiresAt) {
    resetCodes.delete(email.toLowerCase());
    return res.status(400).json({ success: false, message: 'El código ha expirado. Solicita uno nuevo.' });
  }

  if (stored.code !== code) {
    return res.status(400).json({ success: false, message: 'El código de verificación es incorrecto.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const { rowCount } = await pool.query(
      'UPDATE usuarios SET contrasena = $1 WHERE correo_electronico = $2',
      [hashedPassword, email]
    );

    if (rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    resetCodes.delete(email.toLowerCase());
    res.json({ success: true, message: 'Contraseña restablecida correctamente.' });
  } catch (error) {
    console.error('Error en /api/reset-password:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
});

// =================================================================
// ENDPOINT PARA RECEPCIÓN DE DATOS DE SENSORES (ESP32)
// =================================================================

app.post('/api/lecturas', verificarApiKey, async (req, res) => {
  const { macAddress, temperatura, humedad, peso, lluvia, sonido } = req.body;

  if (!macAddress) {
    return res.status(400).json({ success: false, message: 'Falta el campo macAddress.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let sensorId;
    let isNewSensor = false;

    const { rows: sensores } = await client.query('SELECT id, estado FROM sensores WHERE mac_address = $1', [macAddress]);

    if (sensores.length > 0) {
      const sensor = sensores[0];
      if (sensor.estado !== 'activo') {
        throw new Error(`El sensor con MAC ${macAddress} no está activo (estado: ${sensor.estado}).`);
      }
      sensorId = sensor.id;
    } else {
      isNewSensor = true;
      console.log(`AUTO-REGISTRO: Nuevo sensor detectado con MAC: ${macAddress}`);
      const { rows } = await client.query(
        "INSERT INTO sensores (mac_address, estado, fecha_instalacion) VALUES ($1, 'no_asignado', NOW()) RETURNING id",
        [macAddress]
      );
      sensorId = rows[0].id;
    }

    await client.query(
      `INSERT INTO lecturas_ambientales (sensor_id, temperatura, humedad, peso, sonido, lluvia) VALUES ($1, $2, $3, $4, $5, $6)`,
      [sensorId, temperatura, humedad, peso, sonido, lluvia]
    );

    await client.query('UPDATE sensores SET ultima_lectura_en = NOW() WHERE id = $1', [sensorId]);

    await client.query('COMMIT');

    const message = isNewSensor
      ? 'Nuevo sensor registrado y primera lectura guardada con éxito.'
      : 'Lectura registrada con éxito.';

    res.status(201).json({ success: true, message, sensorId });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`Error procesando lectura de MAC ${macAddress}:`, err.message);
    const statusCode = err.message.includes('no está activo') ? 403 : 500;
    res.status(statusCode).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// ==============================================
// ENDPOINT PARA GESTIÓN DE ALERTAS
// ==============================================

app.get('/api/alertas', verificarToken, async (req, res) => {
  const userId = req.usuario.userId;

  try {
    const query = `
      SELECT 
        a.id,
        a.colmena_id,
        a.tipo_alerta,
        a.valor_registrado,
        a.mensaje,
        a.fecha_alerta,
        a.leida,
        c.nombre AS colmena_nombre, 
        ap.nombre AS apiario_nombre
      FROM alertas a
      INNER JOIN colmenas c ON a.colmena_id = c.id
      INNER JOIN apiarios ap ON c.apiario_id = ap.id
      INNER JOIN usuarios_apiarios ua ON ap.id = ua.apiario_id
      WHERE ua.usuario_id = $1
      ORDER BY a.fecha_alerta DESC;
    `;
    const { rows: allAlerts } = await pool.query(query, [userId]);
    
    res.json({ success: true, alertas: allAlerts });

  } catch (error) {
    console.error('Error en GET /api/alertas:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor al obtener alertas.' });
  }
});

app.post('/api/alertas/marcar-como-leidas', verificarToken, async (req, res) => {
  const userId = req.usuario.userId;
  try {
    // Sintaxis de UPDATE para PostgreSQL usando la cláusula USING.
    const markQuery = `
      UPDATE alertas a
      SET leida = TRUE
      FROM colmenas c, usuarios_apiarios ua
      WHERE a.colmena_id = c.id
        AND c.apiario_id = ua.apiario_id
        AND ua.usuario_id = $1
        AND a.leida = FALSE;
    `;
    await pool.query(markQuery, [userId]);
    res.json({ success: true, message: 'Alertas marcadas como leídas.' });
  } catch (err) {
    console.error('Error en POST /api/alertas/marcar-como-leidas:', err);
    res.status(500).json({ success: false, message: 'Error al marcar alertas como leídas.' });
  }
});

app.post('/api/alertas', verificarApiKey, async (req, res) => {
  const { colmena_id, tipo_alerta, valor_registrado, mensaje } = req.body;

  if (!colmena_id || !tipo_alerta || !mensaje) {
    return res.status(400).json({ error: 'Faltan campos requeridos: colmena_id, tipo_alerta, mensaje.' });
  }

  try {
    // Paso 1: Insertar la nueva alerta.
    const insertQuery = 'INSERT INTO alertas (colmena_id, tipo_alerta, valor_registrado, mensaje, leida) VALUES ($1, $2, $3, $4, FALSE)';
    await pool.query(insertQuery, [colmena_id, tipo_alerta, valor_registrado, mensaje]);

    // Paso 2: Obtener todos los usuarios (con sus tokens) asociados a la colmena afectada.
    const { rows: usuarios } = await pool.query(`
      SELECT u.id, u.nombre, u.push_token
      FROM usuarios u
      JOIN usuarios_apiarios ua ON u.id = ua.usuario_id
      JOIN colmenas c ON ua.apiario_id = c.apiario_id
      WHERE c.id = $1 AND u.push_token IS NOT NULL
    `, [colmena_id]);

    // Agrupar tokens por ID de usuario para manejar múltiples dispositivos.
    const usuariosConTokens = usuarios.reduce((acc, user) => {
      if (user.id && user.push_token && Expo.isExpoPushToken(user.push_token)) {
        if (!acc[user.id]) {
          acc[user.id] = { tokens: new Set(), nombre: user.nombre };
        }
        acc[user.id].tokens.add(user.push_token);
      }
      return acc;
    }, {});

    const userIds = Object.keys(usuariosConTokens);
    if (userIds.length === 0) {
      console.log('Alerta registrada, pero no hay usuarios con tokens para notificar.');
      return res.status(201).json({ success: true, message: 'Alerta registrada. No se enviaron notificaciones.' });
    }

    // Paso 3: Para cada usuario, obtener su conteo de alertas y construir los mensajes.
    let allMessages = [];
    for (const userId of userIds) {
      const { rows: countResult } = await pool.query(`
        SELECT COUNT(*) as "unreadCount" FROM alertas a
        JOIN colmenas c ON a.colmena_id = c.id
        JOIN apiarios ap ON c.apiario_id = ap.id
        JOIN usuarios_apiarios ua ON ap.id = ua.apiario_id
        WHERE ua.usuario_id = $1 AND a.leida = FALSE
      `, [userId]);
      
      const unreadCount = parseInt(countResult[0].unreadCount, 10);
      console.log(`DEBUG: Usuario ID ${userId} tiene un nuevo total de ${unreadCount} alertas.`);

      const userTokens = Array.from(usuariosConTokens[userId].tokens);
      const userMessages = userTokens.map(token => ({
        to: token,
        sound: 'default',
        title: `🚨 Alerta en AbejaNet: ${tipo_alerta}`,
        body: mensaje,
        badge: unreadCount, // El contador correcto y actualizado.
        channelId: 'default',
        data: { colmenaId: colmena_id },
      }));
      allMessages.push(...userMessages);
    }

    // Paso 4: Enviar todas las notificaciones.
    const chunks = expo.chunkPushNotifications(allMessages);
    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (error) {
        console.error('Error al enviar un lote de notificaciones:', error);
      }
    }

    res.status(201).json({ success: true, message: 'Alerta registrada y notificaciones enviadas.' });

  } catch (error) {
    console.error('Error al registrar la alerta:', error);
    res.status(500).json({ error: 'Error interno del servidor al registrar la alerta.' });
  }
});

// ==============================================
// ENDPOINTS PARA BITÁCORA APÍCOLA
// ==============================================

// Obtener eventos de bitácora del usuario
app.get('/api/bitacora', verificarToken, async (req, res) => {
  const userId = req.usuario.userId;
  const { apiario_id, limit = 50, offset = 0 } = req.query;

  try {
    let query = `
      SELECT b.*, a.nombre as apiario_nombre,
             u.nombre as autor_nombre, u.apellido_paterno as autor_apellido,
             c.nombre as colmena_nombre
      FROM bitacora b
      JOIN apiarios a ON b.apiario_id = a.id
      JOIN usuarios u ON b.usuario_id = u.id
      LEFT JOIN colmenas c ON b.colmena_id = c.id
      JOIN usuarios_apiarios ua ON ua.apiario_id = a.id
      WHERE ua.usuario_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (apiario_id) {
      query += ` AND b.apiario_id = $${paramIndex}`;
      params.push(apiario_id);
      paramIndex++;
    }

    query += ` ORDER BY b.fecha DESC, b.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await pool.query(query, params);
    res.json({ success: true, events: rows });
  } catch (err) {
    console.error('Error en GET /api/bitacora:', err);
    res.status(500).json({ success: false, message: 'Error al obtener eventos de bitácora.' });
  }
});

// Crear evento de bitácora
app.post('/api/bitacora', verificarToken, async (req, res) => {
  const userId = req.usuario.userId;
  const { apiario_id, colmena_id, fecha, tipo_evento, descripcion } = req.body;

  if (!apiario_id || !tipo_evento) {
    return res.status(400).json({ success: false, message: 'Faltan campos requeridos: apiario_id, tipo_evento.' });
  }

  try {
    // Los admin tienen acceso a todos los apiarios
    if (req.usuario.rol !== 'administrador') {
      const accessCheck = await pool.query(
        'SELECT 1 FROM usuarios_apiarios WHERE usuario_id = $1 AND apiario_id = $2',
        [userId, apiario_id]
      );
      if (accessCheck.rows.length === 0) {
        return res.status(403).json({ success: false, message: 'No tienes acceso a este apiario.' });
      }
    }

    const result = await pool.query(
      `INSERT INTO bitacora (usuario_id, apiario_id, colmena_id, fecha, tipo_evento, descripcion)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, apiario_id, colmena_id || null, fecha || new Date().toISOString().split('T')[0], tipo_evento, descripcion || null]
    );
    res.json({ success: true, event: result.rows[0] });
  } catch (err) {
    console.error('Error en POST /api/bitacora:', err);
    res.status(500).json({ success: false, message: 'Error al crear evento de bitácora.' });
  }
});

// Actualizar evento de bitácora
app.put('/api/bitacora/:id', verificarToken, async (req, res) => {
  const userId = req.usuario.userId;
  const { id } = req.params;
  const { fecha, tipo_evento, descripcion, colmena_id } = req.body;

  try {
    const result = await pool.query(
      `UPDATE bitacora SET fecha = COALESCE($1, fecha), tipo_evento = COALESCE($2, tipo_evento),
       descripcion = COALESCE($3, descripcion), colmena_id = COALESCE($4, colmena_id)
       WHERE id = $5 AND usuario_id = $6 RETURNING *`,
      [fecha || null, tipo_evento || null, descripcion || null, colmena_id !== undefined ? colmena_id : null, id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Evento no encontrado o no autorizado.' });
    }
    res.json({ success: true, event: result.rows[0] });
  } catch (err) {
    console.error('Error en PUT /api/bitacora:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar evento.' });
  }
});

// Eliminar evento de bitácora
app.delete('/api/bitacora/:id', verificarToken, async (req, res) => {
  const userId = req.usuario.userId;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM bitacora WHERE id = $1 AND usuario_id = $2 RETURNING id',
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Evento no encontrado o no autorizado.' });
    }
    res.json({ success: true, message: 'Evento eliminado correctamente.' });
  } catch (err) {
    console.error('Error en DELETE /api/bitacora:', err);
    res.status(500).json({ success: false, message: 'Error al eliminar evento.' });
  }
});

// ==============================================
// ENDPOINT PARA PRUEBAS DE NOTIFICACIONES
// ==============================================
// Este endpoint utiliza el módulo test_notification.js para disparar
// una notificación de prueba. Mantiene index.js limpio y modular.
app.get('/api/test-notification', async (req, res) => {
  try {
    const colmenaNombre = req.query.colmena || 'Colmena Gamma Ppal';
    const mensaje = req.query.mensaje;
    
    const opciones = {};
    if (mensaje) opciones.mensaje = mensaje;

    const resultado = await enviarNotificacionPrueba(colmenaNombre, opciones);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al ejecutar la prueba de notificación.',
      error: error.message,
    });
  }
});

// ==============================================
// ENDPOINT DE SETUP DE BASE DE DATOS (PROTEGIDO)
// ==============================================
// Solo se ejecuta si se proporciona la clave secreta correcta
app.post('/debug/setup-database', async (req, res) => {
  try {
    // Protección: requiere clave secreta
    const { secret } = req.body;
    if (secret !== process.env.SETUP_SECRET) {
      return res.status(403).json({ 
        success: false, 
        message: 'Acceso denegado. Clave secreta incorrecta.' 
      });
    }

    console.log('🚀 Ejecutando setup de base de datos...');
    
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const sqlPath = path.join(__dirname, '..', 'abeja_net_v5_postgres.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sqlScript);
    
    const { rows: tables } = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    
    const { rows: counts } = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM usuarios) as usuarios,
        (SELECT COUNT(*) FROM apiarios) as apiarios,
        (SELECT COUNT(*) FROM colmenas) as colmenas,
        (SELECT COUNT(*) FROM sensores) as sensores
    `);
    
    console.log('✅ Setup completado exitosamente');
    
    res.json({
      success: true,
      message: 'Base de datos configurada exitosamente',
      tables: tables.map(t => t.table_name),
      data: counts[0]
    });
    
  } catch (error) {
    console.error('❌ Error en setup:', error);
    res.status(500).json({
      success: false,
      message: 'Error al configurar base de datos',
      error: error.message
    });
  }
});

// --- Manejador de errores centralizado (red de seguridad) ---
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ success: false, message: 'Error interno del servidor.' });
});

// --- Arranque del Servidor ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API de AbejaNet escuchando en http://0.0.0.0:${PORT}`);
});
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken'; //importación de jwt aquí
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';


// Carga variables de entorno desde .env en la raíz
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

  if (token == null) {
    return res.sendStatus(401); // No hay token, no autorizado
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, usuarioDecodificado) => {
    if (err) {
      console.error('Error al verificar token:', err.message);
      return res.sendStatus(403); // Token inválido o expirado, prohibido
    }
    req.usuario = usuarioDecodificado; // Añade el payload del token al objeto request
    next(); // El token es válido, continúa a la siguiente función/controlador
  });
};

// Luego, para proteger una ruta:
// app.get('/api/colmenas', verificarToken, async (req, res) => {
//   // Si llega aquí, el token fue válido.
//   // req.usuario contiene { userId: ..., rol: ... }
//   res.json({ mensaje: `Datos de colmenas para el usuario ${req.usuario.userId} con rol ${req.usuario.rol}` });
// });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'abeja_user',
  password: process.env.DB_PASS || 'markruger',
    database: process.env.DB_NAME || 'abeja_net_v2',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
//pruebita
app.get('/test-db', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Salud de API para test rápido
app.get('/', (req, res) => res.send('API online'));


// Ruta protegida de ejemplo para obtener el perfil del admin
app.get('/api/admin/perfil', verificarToken, (req, res) => {
  // Si el middleware verificarToken pasa, req.usuario contendrá el payload decodificado del token
  // (que incluye userId y rol, según lo configuramos en jwt.sign)
  if (req.usuario.rol !== 'administrador') { // <--- MODIFICACIÓN AQUÍ
    return res.status(403).json({ success: false, message: 'Acceso denegado. Se requiere rol de administrador.' });
  }
  
  res.json({
    success: true,
    message: 'Datos del perfil del administrador obtenidos con éxito.',
    perfil: {
      id: req.usuario.userId, // Renombramos userId a id para consistencia si es necesario
      rol: req.usuario.rol,
      // Podrías buscar más datos del usuario en la BD usando req.usuario.userId si quisieras
      // correo_electronico: "admin@ejemplo.com" // Ejemplo si lo añadieras desde la BD
    }
  });
});


// Endpoint para registrar un nuevo usuario
app.post('/api/register', async (req, res) => {
  const { correo_electronico, contrasena } = req.body;

  if (!correo_electronico || !contrasena) {
    return res.status(400).json({ success: false, message: 'Correo electrónico y contraseña son requeridos.' });
  }

  try {
    // Verificar si el correo ya existe
    const [usuariosExistentes] = await pool.execute(
      'SELECT id FROM usuarios WHERE correo_electronico = ?',
      [correo_electronico]
    );

    if (usuariosExistentes.length > 0) {
      return res.status(409).json({ success: false, message: 'El correo electrónico ya está registrado.' });
    }

    // Hashear la contraseña
    const saltRounds = 10;
    const contrasenaHasheada = await bcrypt.hash(contrasena, saltRounds);

    // Asumimos que rol_id = 2 es para 'usuario'
    const rolIdUsuario = 2;

    // Insertar el nuevo usuario
    const [resultado] = await pool.execute(
      'INSERT INTO usuarios (correo_electronico, contrasena, rol_id) VALUES (?, ?, ?)',
      [correo_electronico, contrasenaHasheada, rolIdUsuario]
    );

    res.status(201).json({ success: true, message: 'Usuario registrado con éxito.', userId: resultado.insertId });

  } catch (error) {
    console.error('Error en el registro de usuario:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor al registrar el usuario.' });
  }
});


app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // 1. Buscar al usuario solo por correo electrónico
    const [rows] = await pool.execute(
      `SELECT 
         u.id, 
         u.correo_electronico,
         u.contrasena,
         r.nombre AS rol,
         u.esta_activo
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       WHERE u.correo_electronico = ?`,
      [email]
    );

    // Si no se encuentra el usuario
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
    }

    const user = rows[0];

    // 2. Verificar si la cuenta está activa
    if (!user.esta_activo) {
      return res.status(403).json({ success: false, message: 'Usuario inactivo. Contacte al administrador.' });
    }

    // 3. Comparar la contraseña proporcionada con la hasheada en la BD
    const contrasenaValida = await bcrypt.compare(password, user.contrasena);

    if (!contrasenaValida) {
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
    }

    // 4. Si la contraseña es válida, generar el token
    const secretKey = process.env.JWT_SECRET;
    if (!secretKey) {
      console.error('¡ADVERTENCIA! JWT_SECRET no está definido.');
      return res.status(500).json({ success: false, message: 'Error de configuración del servidor.' });
    }
    
    const token = jwt.sign(
      { userId: user.id, rol: user.rol },
      secretKey,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      message: 'Login exitoso',
      token: token,
      user: {
        id: user.id,
        correo_electronico: user.correo_electronico,
        rol: user.rol
      }
    });

  } catch (err) {
    console.error('Error en /login:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: err.message });
  }
});

// =================================================================
// ENDPOINT PARA RECEPCIÓN DE DATOS DE SENSORES (ESP32)
// =================================================================
// Esta ruta no está protegida por token, ya que el ESP32 se autentica
// por su MAC address única registrada en nuestra base de datos.
app.post('/api/lecturas', async (req, res) => {
  // 1. Extraer los datos que el ESP32 envía en el cuerpo de la petición
    const { mac_address, temperatura, humedad, peso, lluvia, sonido } = req.body;

  // 2. Validar que la MAC address fue enviada. Es nuestro identificador clave.
  if (!mac_address) {
    return res.status(400).json({ success: false, message: 'Falta mac_address del dispositivo.' });
  }

  try {
    // 3. Buscar el sensor en la base de datos usando la MAC address para obtener su ID.
    //    Solo aceptamos datos de sensores que estén registrados y 'activos'.
    const [sensores] = await pool.execute(
      'SELECT id FROM sensores WHERE mac_address = ? AND estado = \'activo\'',
      [mac_address]
    );

    if (sensores.length === 0) {
      // Si no se encuentra el sensor o no está activo, se rechaza la petición.
      console.warn(`Recepción de datos de MAC no registrada o inactiva: ${mac_address}`);
      return res.status(404).json({ success: false, message: 'Sensor no encontrado o no está activo.' });
    }

    const sensorId = sensores[0].id;

    // 4. Insertar la nueva lectura en la tabla 'lecturas_ambientales'.
    const [insertResult] = await pool.execute(
      `INSERT INTO lecturas_ambientales (sensor_id, temperatura, humedad, peso, sonido, lluvia, fecha_registro) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [sensorId, temperatura, humedad, peso, sonido, lluvia]
    );
    
    // 5. (Opcional pero recomendado) Actualizar la fecha de la última lectura en la tabla de sensores.
    await pool.execute(
        'UPDATE sensores SET ultima_lectura_en = NOW() WHERE id = ?',
        [sensorId]
    );

    console.log(`Lectura registrada del sensor ID: ${sensorId} (MAC: ${mac_address}).`);
    
    // 6. Enviar una respuesta de éxito al ESP32.
    res.status(201).json({ success: true, message: 'Lectura registrada con éxito.' });

  } catch (err) {
    console.error(`Error procesando lectura de MAC ${mac_address}:`, err);
    res.status(500).json({ success: false, message: 'Error interno del servidor.', error: err.message });
  }
});


// Escucha en todas las interfaces para que sea accesible vía IP local
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API en http://0.0.0.0:${PORT} (todas las interfaces)`);
});

import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Compara dos secretos en tiempo constante (evita ataques de temporización) y nunca da por buena una
// comparación si falta alguno de los dos: p. ej. si la variable de entorno no está definida.
export const secretosIguales = (recibido, esperado) => {
  if (typeof recibido !== 'string' || typeof esperado !== 'string' || !recibido || !esperado) return false;
  const a = crypto.createHash('sha256').update(recibido).digest();
  const b = crypto.createHash('sha256').update(esperado).digest();
  return crypto.timingSafeEqual(a, b);
};

// Verifica el JWT de sesión de usuario (rutas /api/*)
export const verificarToken = (req, res, next) => {
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

// Verifica la clave secreta compartida con endpoints de administración/debug
export const verificarSetupSecret = (req, res, next) => {
  const secret = req.headers['x-setup-secret'] || req.body?.secret;
  if (!secretosIguales(secret, process.env.SETUP_SECRET)) {
    return res.status(403).json({ success: false, message: 'Acceso denegado. Clave secreta incorrecta o no proporcionada.' });
  }
  next();
};

// Verifica la clave de API de dispositivos IoT (ESP32)
export const verificarApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const expectedApiKey = process.env.ESP32_API_KEY;

  console.log(`[AUTH DEBUG] API Key recibida: ${apiKey === expectedApiKey ? 'coincide' : 'no coincide'}`);
  if (!secretosIguales(apiKey, expectedApiKey)) {
    return res.status(401).json({ success: false, message: 'API Key no válida o no proporcionada.' });
  }
  next();
};

import jwt from 'jsonwebtoken';

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
  if (!secret || secret !== process.env.SETUP_SECRET) {
    return res.status(403).json({ success: false, message: 'Acceso denegado. Clave secreta incorrecta o no proporcionada.' });
  }
  next();
};

// Verifica la clave de API de dispositivos IoT (ESP32)
export const verificarApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const expectedApiKey = process.env.ESP32_API_KEY;

  console.log(`[AUTH DEBUG] API Key recibida: ${apiKey === expectedApiKey ? 'coincide' : 'no coincide'}`);
  if (!apiKey || apiKey !== expectedApiKey) {
    return res.status(401).json({ success: false, message: 'API Key no válida o no proporcionada.' });
  }
  next();
};

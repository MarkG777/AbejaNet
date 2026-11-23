// Verificación del correo al registrarse con correo y contraseña.
//
// Problema que resuelve (fallo de seguridad): antes el registro no comprobaba que el correo fuera de quien lo escribía.
// Un atacante podía registrar el correo de otra persona con SU contraseña; si la víctima luego entraba con Google, el
// servidor la metía en esa cuenta (que el atacante también controlaba).
//
// Reglas:
//  1. El registro crea una cuenta PENDIENTE (correo_verificado = false) SIN contraseña y manda un código al correo.
//  2. La contraseña se fija al CONFIRMAR el código (la manda la app junto con el código). Así nadie puede dejar una
//     contraseña "plantada" en un correo ajeno: quien confirma el código es quien tiene el correo.
//  3. Una cuenta pendiente no puede iniciar sesión. Entrar con Google (que sí prueba el correo) la confirma.
//  4. Restablecer la contraseña con el código del correo también confirma la cuenta (ver /api/reset-password).
//  5. Las cuentas que ya existían quedan como verificadas (DEFAULT TRUE); solo el registro nuevo crea cuentas pendientes.
//
// El código no se guarda: solo su HMAC (con JWT_SECRET) y la hora de expiración, en la propia tabla usuarios.
// Así no se pierde si Render reinicia el servidor (los códigos de "olvidé mi contraseña" viven en memoria).

import axios from 'axios';
import crypto from 'crypto';
import { secretosIguales } from './middleware/auth.js';

export const MINUTOS_VIGENCIA = 15;
export const SEGUNDOS_ENTRE_ENVIOS = 60;
export const MAX_INTENTOS = 5;

// Migración idempotente: agrega las columnas si faltan. Las cuentas existentes (y las de Google o creadas por un
// administrador) quedan como verificadas.
export async function asegurarEsquemaVerificacion(db) {
  await db.query(`
    ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS correo_verificado BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS codigo_verificacion VARCHAR(64) NULL,
      ADD COLUMN IF NOT EXISTS codigo_verificacion_expira TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS codigo_verificacion_intentos SMALLINT NOT NULL DEFAULT 0`);
}

export const generarCodigo = () => crypto.randomInt(100000, 1000000).toString();

export function hashCodigo(correo, codigo, secreto = process.env.JWT_SECRET) {
  if (!secreto) throw new Error('JWT_SECRET no configurado');
  return crypto.createHmac('sha256', secreto).update(`${String(correo).trim().toLowerCase()}:${codigo}`).digest('hex');
}

// Envía el código por correo (Brevo, igual que "olvidé mi contraseña"). BREVO_API_URL permite apuntar a un servidor de
// pruebas local; por defecto es la API real.
export async function enviarCodigoPorCorreo(correo, codigo, { post = axios.post } = {}) {
  if (!process.env.BREVO_API_KEY) throw new Error('BREVO_API_KEY no configurada');
  const url = process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email';
  await post(url, {
    sender: { name: 'AbejaNet', email: process.env.BREVO_SENDER_EMAIL || 'noreply@abejanet.com' },
    to: [{ email: correo }],
    subject: 'Confirma tu correo - AbejaNet',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2E7D32; text-align: center;">🐝 AbejaNet</h2>
        <p>Hola,</p>
        <p>Usa este código para confirmar tu correo y terminar tu registro:</p>
        <div style="background: #f5f5f5; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${codigo}</span>
        </div>
        <p style="color: #666; font-size: 14px;">Este código expira en <strong>${MINUTOS_VIGENCIA} minutos</strong>.</p>
        <p style="color: #666; font-size: 14px;">Si no te registraste en AbejaNet, ignora este correo: nadie puede entrar a una cuenta con solo este mensaje.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">AbejaNet - Sistema de Monitoreo Apícola</p>
      </div>`,
  }, { headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' } });
}

// Genera un código nuevo para una cuenta pendiente, lo guarda (solo su HMAC) y lo envía.
// Devuelve { enviado: true } o { enviado: false, motivo: 'espera' } si se pidió otro hace menos de un minuto.
// Si el envío falla lanza el error (el guardado se revierte para no dejar un código que nadie recibió).
export async function enviarCodigoNuevo(db, { id, correo }, { enviar = enviarCodigoPorCorreo } = {}) {
  const { rows } = await db.query(
    `SELECT (codigo_verificacion_expira IS NOT NULL
             AND codigo_verificacion_expira > now() + make_interval(secs => $2)) AS muy_reciente
       FROM usuarios WHERE id = $1`,
    [id, (MINUTOS_VIGENCIA * 60) - SEGUNDOS_ENTRE_ENVIOS]
  );
  if (rows[0]?.muy_reciente) return { enviado: false, motivo: 'espera' };

  const codigo = generarCodigo();
  await db.query(
    `UPDATE usuarios SET codigo_verificacion = $2,
            codigo_verificacion_expira = now() + make_interval(mins => $3),
            codigo_verificacion_intentos = 0
      WHERE id = $1`,
    [id, hashCodigo(correo, codigo), MINUTOS_VIGENCIA]
  );
  try {
    await enviar(correo, codigo);
  } catch (e) {
    await db.query(
      `UPDATE usuarios SET codigo_verificacion = NULL, codigo_verificacion_expira = NULL WHERE id = $1`, [id]
    );
    throw e;
  }
  return { enviado: true };
}

// Comprueba el código y, si es correcto, confirma el correo y fija la contraseña (ya con hash) en una sola sentencia.
// Resultado: { ok: true } | { ok: false, motivo: 'sin_cuenta' | 'ya_verificada' | 'sin_codigo' | 'expirado' | 'bloqueado' | 'incorrecto' }
export async function confirmarCodigo(db, correo, codigo, contrasenaHasheada) {
  const correoNorm = String(correo).trim().toLowerCase();
  const { rows } = await db.query(
    `SELECT id, correo_verificado, codigo_verificacion, codigo_verificacion_intentos AS intentos,
            (codigo_verificacion_expira IS NOT NULL AND codigo_verificacion_expira > now()) AS vigente
       FROM usuarios WHERE LOWER(correo_electronico) = $1`,
    [correoNorm]
  );
  const u = rows[0];
  if (!u) return { ok: false, motivo: 'sin_cuenta' };
  if (u.correo_verificado) return { ok: false, motivo: 'ya_verificada' };
  if (!u.codigo_verificacion) return { ok: false, motivo: 'sin_codigo' };
  if (!u.vigente) return { ok: false, motivo: 'expirado' };
  if (u.intentos >= MAX_INTENTOS) return { ok: false, motivo: 'bloqueado' };

  if (!secretosIguales(u.codigo_verificacion, hashCodigo(correoNorm, String(codigo).trim()))) {
    const intentos = u.intentos + 1;
    if (intentos >= MAX_INTENTOS) {
      // Demasiados fallos: el código se invalida y hay que pedir uno nuevo.
      await db.query(
        `UPDATE usuarios SET codigo_verificacion = NULL, codigo_verificacion_expira = NULL, codigo_verificacion_intentos = 0 WHERE id = $1`,
        [u.id]
      );
      return { ok: false, motivo: 'bloqueado' };
    }
    await db.query('UPDATE usuarios SET codigo_verificacion_intentos = $2 WHERE id = $1', [u.id, intentos]);
    return { ok: false, motivo: 'incorrecto', restantes: MAX_INTENTOS - intentos };
  }

  await db.query(
    `UPDATE usuarios SET correo_verificado = TRUE, contrasena = $2,
            codigo_verificacion = NULL, codigo_verificacion_expira = NULL, codigo_verificacion_intentos = 0
      WHERE id = $1 AND correo_verificado = FALSE`,
    [u.id, contrasenaHasheada]
  );
  return { ok: true, id: u.id };
}

// Confirma el correo sin código porque otra vía ya lo probó (Google o "olvidé mi contraseña").
export async function marcarCorreoVerificado(db, id) {
  await db.query(
    `UPDATE usuarios SET correo_verificado = TRUE, codigo_verificacion = NULL, codigo_verificacion_expira = NULL,
            codigo_verificacion_intentos = 0 WHERE id = $1`,
    [id]
  );
}

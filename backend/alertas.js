// alertas.js
// =================================================================
// Alertas por umbrales críticos + notificación push a TODOS los usuarios a cargo de la colmena.
//
// Flujo (el que describe el diagrama IoT del proyecto: "API evalúa umbrales críticos → push"):
//   lectura del ESP32 → se guarda → evaluarLectura() → si es crítica → registrarAlertaYNotificar()
//     → fila en `alertas` + push a cada usuario con acceso al apiario de esa colmena.
//
// Hasta ahora las alertas solo nacían si algo llamaba a mano a POST /api/alertas: una temperatura excesiva
// recibida del sensor NO generaba ninguna notificación.
// =================================================================

import { Expo } from 'expo-server-sdk';
import pool from './db.js';
import { enviarPush } from './push.js';

// Umbrales CRÍTICOS — ⚠️ PROVISIONALES, PENDIENTES DE VALIDAR CON LITERATURA CIENTÍFICA.
//   temperatura: por defecto, las zonas de "peligro" que ya usa la app (SENSOR_THRESHOLDS en
//                app/(user)/ColmenaDetailScreen.tsx): ≤ 28 °C y ≥ 39 °C → crítica si < 29 o > 38.
//   humedad:     APAGADA por defecto. La literatura revisada indica que la humedad dentro de colmenas sanas varía
//                entre 40 y 95 %, así que 40–70 % daría falsas alarmas. Para activarla en Render → Environment:
//                ALERT_HUM_MIN=40  y/o  ALERT_HUM_MAX=70  (o los valores que se validen).
// Se pueden cambiar SIN tocar el código con variables de entorno (un número, o "off" para desactivar ese límite):
//   ALERT_TEMP_MIN, ALERT_TEMP_MAX, ALERT_HUM_MIN, ALERT_HUM_MAX
//   ALERTAS_AUTOMATICAS=off   (apaga por completo la generación automática de alertas)
// Fundamento, fuentes y estado de la validación: docs/UMBRALES_ALERTAS.md
const leerLimite = (variable, porDefecto) => {
  const crudo = process.env[variable];
  if (crudo === undefined || crudo.trim() === '') return porDefecto;
  if (crudo.trim().toLowerCase() === 'off') return null;
  const n = Number(crudo);
  return Number.isFinite(n) ? n : porDefecto;
};

export const UMBRALES = {
  temperatura: { min: leerLimite('ALERT_TEMP_MIN', 29), max: leerLimite('ALERT_TEMP_MAX', 38), unidad: '°C', nombre: 'Temperatura', tipoBaja: 'TEMPERATURA_BAJA', tipoAlta: 'TEMPERATURA_ALTA' },
  humedad: { min: leerLimite('ALERT_HUM_MIN', null), max: leerLimite('ALERT_HUM_MAX', null), unidad: '%', nombre: 'Humedad', tipoBaja: 'HUMEDAD_BAJA', tipoAlta: 'HUMEDAD_ALTA' },
};

export const ALERTAS_AUTOMATICAS_ACTIVAS = (process.env.ALERTAS_AUTOMATICAS || '').trim().toLowerCase() !== 'off';

// Mientras la condición siga, no se repite la MISMA alerta (misma colmena y tipo) antes de este tiempo.
// Evita mandar un push por minuto (el ESP32 envía cada 60 s). Se puede ajustar con ALERT_COOLDOWN_MINUTES.
export const COOLDOWN_MINUTOS = Number(process.env.ALERT_COOLDOWN_MINUTES) || 120;

const TITULOS = {
  TEMPERATURA_ALTA: 'Temperatura alta',
  TEMPERATURA_BAJA: 'Temperatura baja',
  HUMEDAD_ALTA: 'Humedad alta',
  HUMEDAD_BAJA: 'Humedad baja',
};

const numero = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v));

/**
 * Qué alertas críticas corresponden a una lectura (función pura).
 * @returns {{tipo_alerta:string, valor:number, unidad:string, limite:number, direccion:'alta'|'baja', metrica:string}[]}
 */
export function clasificarLectura({ temperatura, humedad } = {}, umbrales = UMBRALES) {
  const valores = { temperatura: numero(temperatura), humedad: numero(humedad) };
  const criticas = [];
  for (const [metrica, u] of Object.entries(umbrales)) {
    const valor = valores[metrica];
    if (!Number.isFinite(valor)) continue;
    if (u.min !== null && valor < u.min) criticas.push({ tipo_alerta: u.tipoBaja, valor, unidad: u.unidad, limite: u.min, direccion: 'baja', metrica });
    else if (u.max !== null && valor > u.max) criticas.push({ tipo_alerta: u.tipoAlta, valor, unidad: u.unidad, limite: u.max, direccion: 'alta', metrica });
  }
  return criticas;
}

const mensajeDe = (c, nombreColmena, umbrales = UMBRALES) => {
  const { nombre } = umbrales[c.metrica];
  const redondeado = Math.round(c.valor * 10) / 10;
  return c.direccion === 'alta'
    ? `${nombreColmena}: ${nombre.toLowerCase()} crítica de ${redondeado} ${c.unidad} (máximo seguro: ${c.limite} ${c.unidad}).`
    : `${nombreColmena}: ${nombre.toLowerCase()} crítica de ${redondeado} ${c.unidad} (mínimo seguro: ${c.limite} ${c.unidad}).`;
};

/**
 * Crea la alerta en la BD y manda push a TODOS los usuarios con acceso al apiario de la colmena
 * (cada uno recibe el suyo, con su propio contador de alertas sin leer).
 * @returns {Promise<{usuariosDestino:number, push:object}>}
 */
export async function registrarAlertaYNotificar({ colmena_id, tipo_alerta, valor_registrado, mensaje }, { db = pool, enviar = enviarPush } = {}) {
  // Paso 1: la alerta queda registrada (aparece en el historial de la app).
  await db.query(
    'INSERT INTO alertas (colmena_id, tipo_alerta, valor_registrado, mensaje, leida) VALUES ($1, $2, $3, $4, FALSE)',
    [colmena_id, tipo_alerta, valor_registrado, mensaje]
  );

  // Paso 2: todos los usuarios a cargo de la colmena (los asignados a su apiario) con token de notificaciones.
  const { rows: usuarios } = await db.query(
    `SELECT DISTINCT u.id, u.push_token
     FROM usuarios u
     JOIN usuarios_apiarios ua ON u.id = ua.usuario_id
     JOIN colmenas c ON ua.apiario_id = c.apiario_id
     WHERE c.id = $1 AND u.push_token IS NOT NULL AND u.esta_activo IS NOT FALSE`,
    [colmena_id]
  );
  const { rows: colmenas } = await db.query('SELECT nombre FROM colmenas WHERE id = $1', [colmena_id]);
  const nombreColmena = colmenas[0]?.nombre ?? `#${colmena_id}`;

  // Paso 3: un mensaje por dispositivo (un mismo token no se envía dos veces).
  const mensajes = [];
  const tokensVistos = new Set();
  for (const usuario of usuarios) {
    if (!Expo.isExpoPushToken(usuario.push_token) || tokensVistos.has(usuario.push_token)) continue;
    tokensVistos.add(usuario.push_token);
    const { rows } = await db.query(
      `SELECT COUNT(*) AS "unreadCount" FROM alertas a
       JOIN colmenas c ON a.colmena_id = c.id
       JOIN usuarios_apiarios ua ON c.apiario_id = ua.apiario_id
       WHERE ua.usuario_id = $1 AND a.leida = FALSE`,
      [usuario.id]
    );
    mensajes.push({
      to: usuario.push_token,
      sound: 'default',
      title: `🚨 ${TITULOS[tipo_alerta] ?? tipo_alerta} · ${nombreColmena}`,
      body: mensaje,
      badge: parseInt(rows[0].unreadCount, 10),
      channelId: 'default',
      data: { colmenaId: colmena_id, tipo_alerta },
    });
  }

  const push = mensajes.length > 0 ? await enviar(mensajes) : { enviadas: 0, fallidas: 0, tokensEliminados: 0, errores: [] };
  return { usuariosDestino: mensajes.length, push };
}

/**
 * Se llama con cada lectura guardada. Si hay valores críticos, crea la alerta y notifica.
 *  - Confirmación: la lectura ANTERIOR del mismo sensor también debe ser crítica del mismo tipo (un pico aislado
 *    del sensor, p. ej. un error del DHT11, no dispara nada).
 *  - Enfriamiento: no se repite la misma alerta de la misma colmena antes de COOLDOWN_MINUTOS.
 * Nunca debe romper la recepción de datos: quien la llame debe capturar los errores.
 * @returns {Promise<object[]>} las alertas que se generaron
 */
export async function evaluarLectura(sensorId, lectura, { db = pool, notificar = registrarAlertaYNotificar, cooldownMin = COOLDOWN_MINUTOS, activas = ALERTAS_AUTOMATICAS_ACTIVAS, umbrales = UMBRALES } = {}) {
  if (!activas) return [];
  const criticas = clasificarLectura(lectura, umbrales);
  if (criticas.length === 0) return [];

  const { rows: sensores } = await db.query('SELECT colmena_id FROM sensores WHERE id = $1', [sensorId]);
  const colmenaId = sensores[0]?.colmena_id;
  if (!colmenaId) return []; // sensor sin colmena asignada: no hay a quién avisar

  // La lectura recién guardada es la más reciente; la anterior es la siguiente.
  const { rows: previas } = await db.query(
    'SELECT temperatura, humedad FROM lecturas_ambientales WHERE sensor_id = $1 ORDER BY fecha_registro DESC, id DESC OFFSET 1 LIMIT 1',
    [sensorId]
  );
  if (previas.length === 0) return [];
  const tiposPrevios = new Set(clasificarLectura(previas[0], umbrales).map((c) => c.tipo_alerta));

  const { rows: colmenas } = await db.query('SELECT nombre FROM colmenas WHERE id = $1', [colmenaId]);
  const nombreColmena = colmenas[0]?.nombre ?? `#${colmenaId}`;

  const generadas = [];
  for (const c of criticas) {
    if (!tiposPrevios.has(c.tipo_alerta)) continue; // sin confirmar

    const { rows: recientes } = await db.query(
      `SELECT 1 FROM alertas WHERE colmena_id = $1 AND tipo_alerta = $2
       AND fecha_alerta > NOW() - ($3 || ' minutes')::interval LIMIT 1`,
      [colmenaId, c.tipo_alerta, String(cooldownMin)]
    );
    if (recientes.length > 0) continue; // ya se avisó hace poco

    const alerta = {
      colmena_id: colmenaId,
      tipo_alerta: c.tipo_alerta,
      valor_registrado: `${Math.round(c.valor * 10) / 10} ${c.unidad}`,
      mensaje: mensajeDe(c, nombreColmena, umbrales),
    };
    const resultado = await notificar(alerta);
    generadas.push({ ...alerta, ...resultado });
  }
  return generadas;
}

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

// =================================================================
// UMBRALES — criterio: MINIMIZAR EL DAÑO a la colmena. Un solo nivel: CRÍTICO.
// Respaldo bibliográfico de cada valor, nivel de verificación y límites: docs/UMBRALES_ALERTAS.md
// (⚠️ siguen siendo una primera propuesta: se afinarán con datos reales del prototipo en una colmena).
//
// Temperatura (rango en el que se desarrolla la cría: 29–37 °C):
//   FRÍO  (< 29 °C):  alerta si dura más de ALERT_FRIO_MINUTOS (15 min). Un descenso corto (p. ej. colmena abierta
//                     para inspeccionarla) no avisa.
//   CALOR (> 37 °C):  alerta INMEDIATA (ALERT_CALOR_MINUTOS = 0): el calor es el riesgo más urgente.
//   EXTREMO (≥ 43 °C): inmediato; el mensaje advierte de un posible incendio o fallo grave.
//   CAMBIO BRUSCO (≥ 10 °C en ≤ 5 min, sube o baja): inmediato. La colonia regula la cría con mucha precisión, así que
//                     un salto así indica un evento anómalo (colmena abierta, fuego, colonia ausente) o un sensor fallando.
// Humedad: crítica baja < 40 % durante más de ALERT_HUM_BAJA_MINUTOS (5 min); la humedad en colmenas sanas ronda 40–95 %.
//          Humedad alta apagada hasta tener datos.
//
// Cada valor se puede cambiar en Render → Environment SIN tocar el código (un número, o "off" para desactivar un límite):
//   ALERT_TEMP_MIN, ALERT_TEMP_MAX, ALERT_TEMP_EXTREMA_MAX/MIN, ALERT_TEMP_SALTO_GRADOS, ALERT_TEMP_SALTO_MINUTOS,
//   ALERT_FRIO_MINUTOS, ALERT_CALOR_MINUTOS, ALERT_HUM_MIN/MAX, ALERT_HUM_EXTREMA_MAX/MIN,
//   ALERT_HUM_BAJA_MINUTOS, ALERT_HUM_ALTA_MINUTOS, ALERT_COOLDOWN_MINUTES
//   ALERTAS_AUTOMATICAS=off  (apaga por completo la generación automática de alertas)
// =================================================================
const leerLimite = (variable, porDefecto) => {
  const crudo = process.env[variable];
  if (crudo === undefined || crudo.trim() === '') return porDefecto;
  if (crudo.trim().toLowerCase() === 'off') return null;
  const n = Number(crudo);
  return Number.isFinite(n) ? n : porDefecto;
};

export const UMBRALES = {
  temperatura: {
    unidad: '°C', nombre: 'Temperatura',
    tipoBaja: 'TEMPERATURA_BAJA', tipoAlta: 'TEMPERATURA_ALTA', tipoExtremo: 'TEMPERATURA_EXTREMA',
    criticoMin: leerLimite('ALERT_TEMP_MIN', 29), criticoMax: leerLimite('ALERT_TEMP_MAX', 37),
    extremoMin: leerLimite('ALERT_TEMP_EXTREMA_MIN', null), extremoMax: leerLimite('ALERT_TEMP_EXTREMA_MAX', 43),
    minutosBaja: leerLimite('ALERT_FRIO_MINUTOS', 15) ?? 0, minutosAlta: leerLimite('ALERT_CALOR_MINUTOS', 0) ?? 0,
    saltoGrados: leerLimite('ALERT_TEMP_SALTO_GRADOS', 10), saltoMinutos: leerLimite('ALERT_TEMP_SALTO_MINUTOS', 5),
  },
  humedad: {
    unidad: '%', nombre: 'Humedad',
    tipoBaja: 'HUMEDAD_BAJA', tipoAlta: 'HUMEDAD_ALTA', tipoExtremo: 'HUMEDAD_EXTREMA',
    criticoMin: leerLimite('ALERT_HUM_MIN', 40), criticoMax: leerLimite('ALERT_HUM_MAX', null),
    extremoMin: leerLimite('ALERT_HUM_EXTREMA_MIN', null), extremoMax: leerLimite('ALERT_HUM_EXTREMA_MAX', null),
    minutosBaja: leerLimite('ALERT_HUM_BAJA_MINUTOS', 5) ?? 0, minutosAlta: leerLimite('ALERT_HUM_ALTA_MINUTOS', 0) ?? 0,
    saltoGrados: null, saltoMinutos: null,
  },
};

export const ALERTAS_AUTOMATICAS_ACTIVAS = (process.env.ALERTAS_AUTOMATICAS || '').trim().toLowerCase() !== 'off';

// Mientras la condición siga, no se repite la MISMA alerta (misma colmena y tipo) antes de este tiempo.
// Evita un push por minuto (el ESP32 envía cada 60 s). Las extremas y los cambios bruscos se repiten cada 30 min.
export const COOLDOWN_MINUTOS = Number(process.env.ALERT_COOLDOWN_MINUTES) || 60;
export const COOLDOWN_POR_NIVEL = (critico = COOLDOWN_MINUTOS) => ({ extremo: 30, salto: 30, critico });

const TITULOS = {
  TEMPERATURA_ALTA: 'Crítico: temperatura alta',
  TEMPERATURA_BAJA: 'Crítico: temperatura baja',
  TEMPERATURA_EXTREMA: 'Crítico: temperatura extrema',
  HUMEDAD_ALTA: 'Crítico: humedad alta',
  HUMEDAD_BAJA: 'Crítico: humedad baja',
  HUMEDAD_EXTREMA: 'Crítico: humedad extrema',
  CAMBIO_BRUSCO_TEMPERATURA: 'Crítico: cambio brusco de temperatura',
};

const numero = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v));
const redondea = (v) => Math.round(v * 10) / 10;

// Lado ('alta'/'baja') en el que un valor queda fuera de [min, max]; null si está dentro (o el límite está apagado).
const ladoFuera = (valor, min, max) => (min !== null && valor < min ? 'baja' : max !== null && valor > max ? 'alta' : null);

/**
 * Nivel INSTANTÁNEO de un valor (función pura): { nivel: 'extremo'|'critico', direccion, limite } o null.
 * ('critico' aquí solo dice que está fuera del rango; que haya durado lo suficiente lo comprueba evaluarLectura.)
 */
export function nivelDeValor(valor, u) {
  if (!Number.isFinite(valor)) return null;
  if (u.extremoMax !== null && valor >= u.extremoMax) return { nivel: 'extremo', direccion: 'alta', limite: u.extremoMax };
  if (u.extremoMin !== null && valor <= u.extremoMin) return { nivel: 'extremo', direccion: 'baja', limite: u.extremoMin };
  const lado = ladoFuera(valor, u.criticoMin, u.criticoMax);
  if (lado) return { nivel: 'critico', direccion: lado, limite: lado === 'baja' ? u.criticoMin : u.criticoMax };
  return null;
}

const tipoDe = (u, nivel, direccion) => (nivel === 'extremo' ? u.tipoExtremo : direccion === 'alta' ? u.tipoAlta : u.tipoBaja);

/**
 * Qué nivel alcanza una lectura, valor por valor (función pura, sin historial ni duración).
 * @returns {{metrica:string, valor:number, nivel:string, direccion:string, limite:number, unidad:string, tipo_alerta:string}[]}
 */
export function clasificarLectura({ temperatura, humedad } = {}, umbrales = UMBRALES) {
  const valores = { temperatura: numero(temperatura), humedad: numero(humedad) };
  const resultado = [];
  for (const [metrica, u] of Object.entries(umbrales)) {
    const r = nivelDeValor(valores[metrica], u);
    if (r) resultado.push({ metrica, valor: valores[metrica], unidad: u.unidad, tipo_alerta: tipoDe(u, r.nivel, r.direccion), ...r });
  }
  return resultado;
}

const mensajeDe = (c, nombreColmena, umbrales = UMBRALES, extra = {}) => {
  const u = umbrales[c.metrica];
  const nombre = u.nombre.toLowerCase();
  const v = `${redondea(c.valor)} ${c.unidad}`;
  if (c.nivel === 'salto') {
    return `${nombreColmena}: la ${nombre} cambió ${redondea(extra.diferencia)} ${c.unidad} en menos de ${u.saltoMinutos} min (de ${redondea(extra.referencia)} a ${v}). Revisa la colmena de inmediato: puede ser un evento anómalo (posible incendio) o un fallo del sensor.`;
  }
  if (c.nivel === 'extremo') {
    return `${nombreColmena}: ${nombre} EXTREMA de ${v} (límite: ${c.limite} ${c.unidad}). Posible incendio o fallo grave: revisa la colmena de inmediato.`;
  }
  if (c.direccion === 'alta') {
    return `${nombreColmena}: ${nombre} crítica de ${v} (máximo seguro: ${c.limite} ${c.unidad}). Revisa la colmena.`;
  }
  const duracion = extra.minutos > 0 ? ` durante más de ${extra.minutos} min` : '';
  return `${nombreColmena}: ${nombre} crítica de ${v} (mínimo seguro: ${c.limite} ${c.unidad})${duracion}.`;
};

// ---------------------------------------------------------------
// Descripciones para el chatbot (siempre salen de los mismos valores que usa el sistema)
// ---------------------------------------------------------------
const minTxt = (m) => (m > 0 ? ` durante más de ${m} min` : ' de inmediato');

/** Significado de un tipo de alerta, en palabras. Los tipos que no son por umbral se describen de forma genérica. */
export function describirAlerta(tipo, umbrales = UMBRALES) {
  const t = umbrales.temperatura; const h = umbrales.humedad;
  const catalogo = {
    TEMPERATURA_ALTA: { nivel: 'critico', significado: `Temperatura por encima de ${t.criticoMax} °C (la cría no se desarrolla bien por encima de ese valor). Se avisa${minTxt(t.minutosAlta)}.` },
    TEMPERATURA_BAJA: { nivel: 'critico', significado: `Temperatura por debajo de ${t.criticoMin} °C (la cría no se desarrolla bien por debajo de ese valor). Se avisa si dura más de ${t.minutosBaja} min, para no alertar por una inspección breve.` },
    TEMPERATURA_EXTREMA: { nivel: 'extremo', significado: `Temperatura de ${t.extremoMax} °C o más: muy por encima de lo que tolera la cría. Posible incendio o fallo grave; revisar de inmediato.` },
    CAMBIO_BRUSCO_TEMPERATURA: { nivel: 'salto', significado: `La temperatura cambió ${t.saltoGrados} °C o más en menos de ${t.saltoMinutos} min. La colonia regula su temperatura con mucha precisión, así que indica un evento anómalo (colmena abierta, fuego, colonia ausente) o un sensor con fallo.` },
    HUMEDAD_BAJA: { nivel: 'critico', significado: `Humedad por debajo de ${h.criticoMin} %${minTxt(h.minutosBaja)}: por debajo del rango observado en colmenas sanas (40–95 %).` },
  };
  if (h.criticoMax !== null) catalogo.HUMEDAD_ALTA = { nivel: 'critico', significado: `Humedad por encima de ${h.criticoMax} %.` };
  return catalogo[tipo] ?? { nivel: 'otro', significado: 'Alerta registrada manualmente o por otro sistema (no es una alerta automática por umbral).' };
}

/** Texto para las instrucciones del chatbot: cómo funcionan las alertas automáticas y qué significa cada tipo. */
export function glosarioDeAlertas(umbrales = UMBRALES) {
  const t = umbrales.temperatura;
  const tipos = ['TEMPERATURA_ALTA', 'TEMPERATURA_BAJA', 'TEMPERATURA_EXTREMA', 'CAMBIO_BRUSCO_TEMPERATURA', 'HUMEDAD_BAJA'];
  return [
    'ALERTAS AUTOMÁTICAS DE AbejaNet (datos reales del servidor):',
    `- Todas son de nivel CRÍTICO. El rango de temperatura en el que se desarrolla la cría es ${t.criticoMin}–${t.criticoMax} °C.`,
    '- Llegan al celular como notificación push a todos los usuarios con acceso al apiario de la colmena.',
    ...tipos.map((tipo) => `- ${tipo}: ${describirAlerta(tipo, umbrales).significado}`),
    '- Los umbrales son una PRIMERA PROPUESTA basada en literatura científica y se ajustarán con datos reales de las colmenas; dilo si te preguntan por qué se alertó o si es correcto.',
  ].join('\n');
}

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

// ¿Todas las lecturas de los últimos `minutos` min estuvieron fuera del rango crítico del mismo lado?
// Con 0 minutos no se espera nada (inmediato). Exige al menos 3 lecturas que cubran ≥ 80 % de la ventana
// (el ESP32 envía cada 60 s: si enviara con menos frecuencia que ventana/3, esta regla no podría cumplirse).
const sostenido = (hist, metrica, u, direccion, minutos, tAhora) => {
  if (!minutos) return true;
  const ventanaMs = minutos * 60000;
  const enVentana = hist.filter((h) => h.t >= tAhora - ventanaMs);
  if (enVentana.length < 3 || tAhora - enVentana[enVentana.length - 1].t < ventanaMs * 0.8) return false;
  return enVentana.every((h) => ladoFuera(h[metrica], u.criticoMin, u.criticoMax) === direccion);
};

/**
 * Se llama con cada lectura guardada. Genera alertas críticas y notifica por push.
 *  - extremo (≥ 43 °C): inmediato.
 *  - fuera del rango crítico: según el lado — calor inmediato; frío solo si dura más de ALERT_FRIO_MINUTOS.
 *  - cambio brusco: la temperatura difiere ≥ saltoGrados de alguna lectura de los últimos saltoMinutos (inmediato).
 *  - Enfriamiento por tipo y nivel: la misma alerta de la misma colmena no se repite antes del tiempo del nivel.
 * Nunca debe romper la recepción de datos: quien la llame debe capturar los errores.
 * @returns {Promise<object[]>} las alertas que se generaron
 */
export async function evaluarLectura(sensorId, lectura, {
  db = pool, notificar = registrarAlertaYNotificar, cooldownMin = COOLDOWN_MINUTOS, activas = ALERTAS_AUTOMATICAS_ACTIVAS,
  umbrales = UMBRALES,
} = {}) {
  if (!activas) return [];

  const actuales = { temperatura: numero(lectura?.temperatura), humedad: numero(lectura?.humedad) };
  // Atajo: si ningún valor sale del rango y no hay regla de salto aplicable, no se consulta nada.
  const hayAlgo = Object.entries(umbrales).some(([m, u]) => nivelDeValor(actuales[m], u) || (u.saltoGrados !== null && Number.isFinite(actuales[m])));
  if (!hayAlgo) return [];

  const { rows: sensores } = await db.query('SELECT colmena_id FROM sensores WHERE id = $1', [sensorId]);
  const colmenaId = sensores[0]?.colmena_id;
  if (!colmenaId) return []; // sensor sin colmena asignada: no hay a quién avisar

  // Historial reciente (la lectura recién guardada es la primera).
  const { rows: filas } = await db.query(
    'SELECT temperatura, humedad, fecha_registro FROM lecturas_ambientales WHERE sensor_id = $1 ORDER BY fecha_registro DESC, id DESC LIMIT 150',
    [sensorId]
  );
  const hist = filas.map((f) => ({ t: new Date(f.fecha_registro).getTime(), temperatura: numero(f.temperatura), humedad: numero(f.humedad) }));
  const tAhora = hist[0]?.t ?? Date.now();

  const { rows: colmenas } = await db.query('SELECT nombre FROM colmenas WHERE id = $1', [colmenaId]);
  const nombreColmena = colmenas[0]?.nombre ?? `#${colmenaId}`;
  const cooldowns = COOLDOWN_POR_NIVEL(cooldownMin);

  // 1) Candidatas
  const candidatas = [];
  for (const [metrica, u] of Object.entries(umbrales)) {
    const valor = actuales[metrica];
    const r = nivelDeValor(valor, u);
    const base = { metrica, valor, unidad: u.unidad };

    if (r?.nivel === 'extremo') {
      candidatas.push({ ...base, ...r, tipo_alerta: tipoDe(u, 'extremo', r.direccion), extra: {} });
    } else if (r?.nivel === 'critico') {
      const minutos = r.direccion === 'baja' ? u.minutosBaja : u.minutosAlta;
      if (sostenido(hist, metrica, u, r.direccion, minutos, tAhora)) {
        candidatas.push({ ...base, ...r, tipo_alerta: tipoDe(u, 'critico', r.direccion), extra: { minutos } });
      }
    }

    // Cambio brusco (solo magnitudes con regla de salto, p. ej. la temperatura)
    if (u.saltoGrados !== null && u.saltoMinutos !== null && Number.isFinite(valor)) {
      const recientes = hist.slice(1).filter((h) => h.t >= tAhora - u.saltoMinutos * 60000 && Number.isFinite(h[metrica]));
      let mayor = null;
      for (const h of recientes) {
        const dif = Math.abs(valor - h[metrica]);
        if (dif >= u.saltoGrados && (!mayor || dif > mayor.diferencia)) mayor = { diferencia: dif, referencia: h[metrica] };
      }
      if (mayor) {
        candidatas.push({ ...base, nivel: 'salto', direccion: valor > mayor.referencia ? 'alta' : 'baja', limite: u.saltoGrados, tipo_alerta: 'CAMBIO_BRUSCO_' + u.nombre.toUpperCase(), extra: mayor });
      }
    }
  }

  // 2) Enfriamiento y envío
  const generadas = [];
  for (const c of candidatas) {
    const { rows: recientes } = await db.query(
      `SELECT 1 FROM alertas WHERE colmena_id = $1 AND tipo_alerta = $2
       AND fecha_alerta > NOW() - ($3 || ' minutes')::interval LIMIT 1`,
      [colmenaId, c.tipo_alerta, String(cooldowns[c.nivel])]
    );
    if (recientes.length > 0) continue; // ya se avisó hace poco

    const alerta = {
      colmena_id: colmenaId,
      tipo_alerta: c.tipo_alerta,
      valor_registrado: `${redondea(c.valor)} ${c.unidad}`,
      mensaje: mensajeDe(c, nombreColmena, umbrales, c.extra),
    };
    const resultado = await notificar(alerta);
    generadas.push({ ...alerta, nivel: c.nivel, ...resultado });
  }
  return generadas;
}

// push.js
// =================================================================
// Envío de notificaciones push (Expo). Lo usan index.js (alertas reales) y test_notification.js (pruebas),
// para que ambos se comporten igual.
//
// Antes el resultado del envío se descartaba: si Expo rechazaba una notificación (p. ej. el token ya no es
// válido) la alerta quedaba guardada pero el push no llegaba, y nadie se enteraba. Ahora:
//   - se revisa el "ticket" de cada notificación,
//   - los tokens que Expo marca como DeviceNotRegistered se borran de la base de datos,
//   - se devuelve cuántas se enviaron y cuántas fallaron (y por qué).
// =================================================================

import { Expo } from 'expo-server-sdk';
import pool from './db.js';

const expoPorDefecto = new Expo();

/**
 * @param {object[]} mensajes - mensajes de Expo ({ to, title, body, ... })
 * @param {object} [deps] - solo para pruebas: { expo, db }
 * @returns {Promise<{enviadas:number, fallidas:number, tokensEliminados:number, errores:string[]}>}
 */
export async function enviarPush(mensajes, { expo = expoPorDefecto, db = pool } = {}) {
  let enviadas = 0;
  let fallidas = 0;
  const errores = new Set();
  const tokensInvalidos = new Set();

  for (const lote of expo.chunkPushNotifications(mensajes)) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(lote);
      tickets.forEach((ticket, i) => {
        if (ticket.status === 'ok') {
          enviadas++;
          return;
        }
        fallidas++;
        errores.add(ticket.details?.error || ticket.message || 'error desconocido');
        if (ticket.details?.error === 'DeviceNotRegistered' && lote[i]?.to) {
          tokensInvalidos.add(lote[i].to);
        }
      });
    } catch (error) {
      fallidas += lote.length;
      errores.add(error.message);
      console.error('[PUSH] Error al enviar un lote de notificaciones:', error.message);
    }
  }

  // Un token que Expo ya no reconoce nunca va a recibir nada: se borra para no seguir fallando en silencio.
  if (tokensInvalidos.size > 0) {
    try {
      await db.query('UPDATE usuarios SET push_token = NULL WHERE push_token = ANY($1::text[])', [[...tokensInvalidos]]);
    } catch (error) {
      console.error('[PUSH] No se pudieron limpiar los tokens inválidos:', error.message);
    }
  }

  if (fallidas > 0) {
    console.warn(`[PUSH] ${fallidas} de ${enviadas + fallidas} notificaciones NO se enviaron: ${[...errores].join(', ')}`);
  }

  return { enviadas, fallidas, tokensEliminados: tokensInvalidos.size, errores: [...errores] };
}

export default enviarPush;

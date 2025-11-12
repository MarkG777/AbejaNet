// test_notification.js
// =================================================================
// Módulo para disparar notificaciones de prueba en colmenas específicas
// Este módulo es independiente y puede ser llamado desde endpoints o scripts
// =================================================================

import { Expo } from 'expo-server-sdk';
import pool from './db.js';

const expo = new Expo();

/**
 * Dispara una notificación de prueba para una colmena específica
 * @param {string} colmenaNombre - Nombre de la colmena (por defecto: 'Colmena Gamma Ppal')
 * @param {object} options - Opciones personalizables para la notificación
 * @param {string} options.tipoAlerta - Tipo de alerta (por defecto: 'PRUEBA_NOTIFICACION')
 * @param {string} options.mensaje - Mensaje personalizado
 * @param {boolean} options.insertarEnBD - Si se debe insertar la alerta en la BD (por defecto: true)
 * @returns {Promise<object>} Resultado de la operación con estadísticas
 */
async function enviarNotificacionPrueba(
  colmenaNombre = 'Colmena Gamma Ppal',
  options = {}
) {
  const {
    tipoAlerta = 'PRUEBA_NOTIFICACION',
    mensaje = '🐝 Esta es una notificación de prueba desde AbejaNet. ¡Sistema funcionando correctamente!',
    insertarEnBD = true,
  } = options;

  let client;

  try {
    console.log('\n🔔 ===============================================');
    console.log('   INICIANDO PRUEBA DE NOTIFICACIÓN');
    console.log('===============================================');
    console.log(`📍 Colmena objetivo: ${colmenaNombre}`);
    console.log(`📢 Tipo de alerta: ${tipoAlerta}`);
    console.log(`💬 Mensaje: ${mensaje}`);
    console.log('===============================================\n');

    client = await pool.connect();

    // ============================================================
    // PASO 1: Buscar la colmena por nombre
    // ============================================================
    console.log('🔍 [PASO 1/5] Buscando colmena en la base de datos...');
    const { rows: colmenas } = await client.query(
      'SELECT id, nombre FROM colmenas WHERE nombre = $1',
      [colmenaNombre]
    );

    if (colmenas.length === 0) {
      throw new Error(
        `❌ No se encontró la colmena "${colmenaNombre}". Verifica que exista en la base de datos.`
      );
    }

    const colmena = colmenas[0];
    console.log(`   ✅ Colmena encontrada: ${colmena.nombre} (ID: ${colmena.id})\n`);

    // ============================================================
    // PASO 2: Insertar la alerta en la base de datos (opcional)
    // ============================================================
    if (insertarEnBD) {
      console.log('💾 [PASO 2/5] Registrando alerta en la base de datos...');
      await client.query(
        'INSERT INTO alertas (colmena_id, tipo_alerta, valor_registrado, mensaje, leida) VALUES ($1, $2, $3, $4, FALSE)',
        [colmena.id, tipoAlerta, 'N/A - Prueba', mensaje]
      );
      console.log('   ✅ Alerta registrada exitosamente.\n');
    } else {
      console.log('⏭️  [PASO 2/5] Saltando registro en BD (modo dry-run).\n');
    }

    // ============================================================
    // PASO 3: Obtener usuarios con tokens push
    // ============================================================
    console.log('👥 [PASO 3/5] Buscando usuarios con tokens de notificación...');
    const { rows: usuarios } = await client.query(
      `
      SELECT DISTINCT u.id, u.nombre, u.correo_electronico, u.push_token
      FROM usuarios u
      JOIN usuarios_apiarios ua ON u.id = ua.usuario_id
      JOIN colmenas c ON ua.apiario_id = c.apiario_id
      WHERE c.id = $1 AND u.push_token IS NOT NULL
    `,
      [colmena.id]
    );

    console.log(`   📊 Usuarios encontrados: ${usuarios.length}`);

    if (usuarios.length === 0) {
      console.log('   ⚠️  ADVERTENCIA: No hay usuarios con tokens push registrados.');
      console.log('   💡 Sugerencia: Abre la app en un dispositivo y acepta los permisos de notificaciones.\n');
      
      return {
        success: true,
        advertencia: 'No hay usuarios con tokens para notificar',
        colmenaId: colmena.id,
        colmenaNombre: colmena.nombre,
        usuariosEncontrados: 0,
        notificacionesEnviadas: 0,
      };
    }

    // Mostrar detalles de los usuarios
    usuarios.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.nombre || 'Sin nombre'} (${user.correo_electronico})`);
      console.log(`      Token: ${user.push_token.substring(0, 30)}...`);
    });
    console.log('');

    // ============================================================
    // PASO 4: Preparar los mensajes de notificación
    // ============================================================
    console.log('📝 [PASO 4/5] Preparando mensajes de notificación...');

    const usuariosConTokens = {};
    const tokensInvalidos = [];

    usuarios.forEach((user) => {
      if (Expo.isExpoPushToken(user.push_token)) {
        if (!usuariosConTokens[user.id]) {
          usuariosConTokens[user.id] = {
            tokens: new Set(),
            nombre: user.nombre,
            correo: user.correo_electronico,
          };
        }
        usuariosConTokens[user.id].tokens.add(user.push_token);
      } else {
        tokensInvalidos.push({
          usuario: user.nombre || user.correo_electronico,
          token: user.push_token,
        });
      }
    });

    if (tokensInvalidos.length > 0) {
      console.log('   ⚠️  Tokens inválidos encontrados:');
      tokensInvalidos.forEach((invalid) => {
        console.log(`      - ${invalid.usuario}: ${invalid.token}`);
      });
    }

    // Construir los mensajes
    const allMessages = [];
    for (const userId of Object.keys(usuariosConTokens)) {
      // Obtener el conteo de alertas no leídas para el badge
      const { rows: countResult } = await client.query(
        `
        SELECT COUNT(*) as "unreadCount" 
        FROM alertas a
        JOIN colmenas c ON a.colmena_id = c.id
        JOIN apiarios ap ON c.apiario_id = ap.id
        JOIN usuarios_apiarios ua ON ap.id = ua.apiario_id
        WHERE ua.usuario_id = $1 AND a.leida = FALSE
      `,
        [userId]
      );

      const unreadCount = parseInt(countResult[0].unreadCount, 10);
      const userTokens = Array.from(usuariosConTokens[userId].tokens);

      const userMessages = userTokens.map((token) => ({
        to: token,
        sound: 'default',
        title: `🔔 Prueba - ${tipoAlerta}`,
        body: mensaje,
        badge: unreadCount,
        channelId: 'default',
        data: { 
          colmenaId: colmena.id, 
          colmenaNombre: colmena.nombre,
          test: true 
        },
      }));

      allMessages.push(...userMessages);
    }

    console.log(`   ✅ ${allMessages.length} notificación(es) preparada(s).\n`);

    // ============================================================
    // PASO 5: Enviar las notificaciones
    // ============================================================
    console.log('🚀 [PASO 5/5] Enviando notificaciones push...');

    const chunks = expo.chunkPushNotifications(allMessages);
    let notificacionesEnviadas = 0;
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        notificacionesEnviadas += chunk.length;
        console.log(`   ✅ Lote enviado: ${chunk.length} notificación(es)`);
      } catch (error) {
        console.error(`   ❌ Error al enviar lote:`, error.message);
      }
    }

    console.log('\n🎉 ===============================================');
    console.log('   PRUEBA DE NOTIFICACIÓN COMPLETADA');
    console.log('===============================================');
    console.log(`✅ Notificaciones enviadas: ${notificacionesEnviadas}`);
    console.log(`👥 Usuarios notificados: ${Object.keys(usuariosConTokens).length}`);
    console.log(`📱 Dispositivos alcanzados: ${notificacionesEnviadas}`);
    console.log('===============================================\n');

    return {
      success: true,
      message: `Notificación de prueba enviada correctamente a ${notificacionesEnviadas} dispositivo(s).`,
      colmenaId: colmena.id,
      colmenaNombre: colmena.nombre,
      usuariosNotificados: Object.keys(usuariosConTokens).length,
      notificacionesEnviadas,
      tickets: tickets.map((t) => ({ id: t.id, status: t.status })),
      tokensInvalidos: tokensInvalidos.length,
    };
  } catch (error) {
    console.error('\n❌ ===============================================');
    console.error('   ERROR EN LA PRUEBA DE NOTIFICACIÓN');
    console.error('===============================================');
    console.error(`🔴 ${error.message}`);
    console.error('===============================================\n');

    throw error; // Re-lanzar el error para que el llamador lo maneje
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Exportar la función principal
export default enviarNotificacionPrueba;

// Exportar también una versión con nombre para mayor flexibilidad
export { enviarNotificacionPrueba };

// ============================================================
// 📖 CÓMO PROBAR ESTE MÓDULO
// ============================================================
//
// Este módulo se puede probar de 3 formas:
//
// 🌐 FORMA 1: DESDE EL NAVEGADOR (MÁS FÁCIL)
// ----------------------------------------
// 1. Haz push de los cambios a Render:
//    git add backend/
//    git commit -m "Add notification test module"
//    git push
//
// 2. Espera 2-3 minutos mientras Render despliega
//
// 3. Abre en tu navegador:
//    https://abejanet-backend.onrender.com/api/test-notification
//
// 4. ¡Revisa tu teléfono! Deberías recibir la notificación
//
// 💡 Personalizar la prueba:
//    https://abejanet-backend.onrender.com/api/test-notification?colmena=Colmena%20Gamma%20Ppal&mensaje=Mi%20prueba
//
// ============================================================
//
// 🖥️ FORMA 2: DESDE LA TERMINAL CON CURL
// ----------------------------------------
// curl "https://abejanet-backend.onrender.com/api/test-notification"
//
// O con parámetros:
// curl "https://abejanet-backend.onrender.com/api/test-notification?colmena=Colmena%20Gamma%20Ppal"
//
// ============================================================
//
// 🚀 FORMA 3: SCRIPT LOCAL (MODO DESARROLLO)
// ----------------------------------------
// Ejecuta desde la raíz del proyecto:
// node backend/run_test_notification.js
//
// Con parámetros personalizados:
// node backend/run_test_notification.js "Colmena Gamma Ppal" "Mi mensaje"
//
// ============================================================
//
// ✅ CHECKLIST ANTES DE PROBAR
// ----------------------------------------
// [ ] La colmena "Colmena Gamma Ppal" existe en tu base de datos
// [ ] Hay un usuario asignado al apiario de esa colmena
// [ ] El usuario tiene la app instalada y aceptó permisos de notificaciones
// [ ] El push_token del usuario está guardado en la base de datos
//
// 🔍 VERIFICAR COLMENAS DISPONIBLES:
// Ejecuta en tu terminal (conectado a tu DB):
// SELECT nombre FROM colmenas;
//
// ============================================================
//
// 📊 RESPUESTA ESPERADA
// ----------------------------------------
// Si todo funciona correctamente, verás:
// {
//   "success": true,
//   "message": "Notificación de prueba enviada...",
//   "colmenaId": 3,
//   "colmenaNombre": "Colmena Gamma Ppal",
//   "usuariosNotificados": 1,
//   "notificacionesEnviadas": 1
// }
//
// ⚠️ Si no hay usuarios con tokens:
// {
//   "success": true,
//   "advertencia": "No hay usuarios con tokens para notificar",
//   "usuariosEncontrados": 0
// }
// 
// 💡 Solución: Abre la app en tu teléfono y acepta los permisos
//
// ============================================================

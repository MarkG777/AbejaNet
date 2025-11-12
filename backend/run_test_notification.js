#!/usr/bin/env node
// run_test_notification.js
// =================================================================
// Script ejecutable para probar notificaciones desde la terminal
// Uso: node backend/run_test_notification.js [nombre-colmena] [mensaje]
// Ejemplo: node backend/run_test_notification.js "Colmena Gamma Ppal" "Alerta de prueba"
// =================================================================

import enviarNotificacionPrueba from './test_notification.js';
import pool from './db.js';

// Obtener argumentos de línea de comandos
const args = process.argv.slice(2);
const colmenaNombre = args[0] || 'Colmena Gamma Ppal';
const mensajePersonalizado = args[1];

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║     SCRIPT DE PRUEBA DE NOTIFICACIONES - ABEJANET         ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Configurar opciones
const opciones = {};
if (mensajePersonalizado) {
  opciones.mensaje = mensajePersonalizado;
}

// Ejecutar la prueba
(async () => {
  try {
    const resultado = await enviarNotificacionPrueba(colmenaNombre, opciones);
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    RESUMEN FINAL                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\n${JSON.stringify(resultado, null, 2)}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n╔════════════════════════════════════════════════════════════╗');
    console.error('║                     ERROR FATAL                            ║');
    console.error('╚════════════════════════════════════════════════════════════╝');
    console.error(`\n❌ ${error.message}\n`);
    process.exit(1);
  } finally {
    // Asegurarse de cerrar el pool al finalizar
    await pool.end();
  }
})();

// ============================================================
// 📖 CÓMO USAR ESTE SCRIPT
// ============================================================
//
// Este script es para PRUEBAS LOCALES en modo desarrollo.
// Ejecuta las notificaciones directamente desde tu terminal.
//
// ============================================================
// 
// 🚀 USO BÁSICO
// ----------------------------------------
// Desde la raíz del proyecto, ejecuta:
//
// node backend/run_test_notification.js
//
// Esto enviará una notificación a la "Colmena Gamma Ppal"
// con el mensaje predeterminado.
//
// ============================================================
//
// 🎯 USO CON PARÁMETROS
// ----------------------------------------
//
// ESPECIFICAR SOLO LA COLMENA:
// node backend/run_test_notification.js "Colmena Beta Lab"
//
// ESPECIFICAR COLMENA Y MENSAJE:
// node backend/run_test_notification.js "Colmena Gamma Ppal" "Alerta de temperatura alta"
//
// EJEMPLO COMPLETO:
// node backend/run_test_notification.js "Colmena Gamma Ppal" "¡Prueba desde terminal!"
//
// ============================================================
//
// ⚙️ REQUISITOS PREVIOS
// ----------------------------------------
// Antes de ejecutar este script, asegúrate de:
//
// 1. ✅ Estar en la raíz del proyecto AbejaNet
// 2. ✅ Tener las dependencias instaladas (npm install)
// 3. ✅ Tu archivo .env configurado correctamente
// 4. ✅ Conexión a internet (para conectar a la BD en Render)
// 5. ✅ La colmena existe en la base de datos
// 6. ✅ Hay un usuario asignado con push_token válido
//
// ============================================================
//
// 📊 QUÉ ESPERAR
// ----------------------------------------
//
// Verás una salida detallada en tu terminal:
//
// 🔔 ===============================================
//    INICIANDO PRUEBA DE NOTIFICACIÓN
// ===============================================
// 📍 Colmena objetivo: Colmena Gamma Ppal
// 📢 Tipo de alerta: PRUEBA_NOTIFICACION
// ...
// 🎉 PRUEBA DE NOTIFICACIÓN COMPLETADA
//
// ============================================================
//
// ❌ SOLUCIÓN DE PROBLEMAS
// ----------------------------------------
//
// ERROR: "No se encontró la colmena"
// ➜ Verifica el nombre exacto con:
//   SELECT nombre FROM colmenas;
//
// ERROR: "No hay usuarios con tokens"
// ➜ Abre la app en tu teléfono
// ➜ Acepta los permisos de notificaciones
// ➜ El token se guardará automáticamente
//
// ERROR: "Connection refused"
// ➜ Verifica tu archivo .env
// ➜ Asegúrate de tener internet
// ➜ Confirma que la DB_HOST sea correcta
//
// ============================================================
//
// 💡 CONSEJO PRO
// ----------------------------------------
//
// Para pruebas rápidas sin push a Render, usa este script.
// Para pruebas desde el navegador, usa el endpoint:
// https://abejanet-backend.onrender.com/api/test-notification
//
// ============================================================

#!/usr/bin/env node
// run_test_notification.js
// =================================================================
// Script ejecutable para probar notificaciones desde la terminal
// Uso: node backend/run_test_notification.js [nombre-colmena] [mensaje]
// Ejemplo: node backend/run_test_notification.js "Colmena Gamma Ppal" "Alerta de prueba"
// =================================================================

import pool from "./db.js";
import enviarNotificacionPrueba from "./test_notification.js";

// Obtener argumentos de línea de comandos
const todos = process.argv.slice(2);
const banderas = todos.filter((a) => a.startsWith("--"));
const args = todos.filter((a) => !a.startsWith("--"));
// Nombre de una COLMENA (no de un apiario). Por defecto, la colmena de prueba del BME280.
const colmenaNombre = args[0] || "Colmena BME280 Prueba";
const mensajePersonalizado = args[1];

console.log("\n╔════════════════════════════════════════════════════════════╗");
console.log("║     SCRIPT DE PRUEBA DE NOTIFICACIONES - ABEJANET         ║");
console.log("╚════════════════════════════════════════════════════════════╝\n");

// Configurar opciones
const opciones = {};
if (mensajePersonalizado) {
  opciones.mensaje = mensajePersonalizado;
}
// --sin-alerta: envía solo la notificación push, sin guardar una alerta de prueba en la base de datos.
if (banderas.includes("--sin-alerta")) {
  opciones.insertarEnBD = false;
}

// Ejecutar la prueba
(async () => {
  try {
    const resultado = await enviarNotificacionPrueba(colmenaNombre, opciones);

    console.log(
      "\n╔════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║                    RESUMEN FINAL                           ║",
    );
    console.log(
      "╚════════════════════════════════════════════════════════════╝",
    );
    console.log(`\n${JSON.stringify(resultado, null, 2)}\n`);

    process.exit(0);
  } catch (error) {
    console.error(
      "\n╔════════════════════════════════════════════════════════════╗",
    );
    console.error(
      "║                     ERROR FATAL                            ║",
    );
    console.error(
      "╚════════════════════════════════════════════════════════════╝",
    );
    console.error(`\n❌ ${error.message}\n`);
    process.exit(1);
  } finally {
    // Asegurarse de cerrar el pool al finalizar
    await pool.end();
  }
})();


// Uso (desde la carpeta backend; usa la base de datos del .env, o sea la de Render):
//   node --env-file=.env run_test_notification.js "<colmena>" ["<mensaje>"] [--sin-alerta]
// Detalles y solución de problemas: backend/TEST_NOTIFICATIONS_README.md

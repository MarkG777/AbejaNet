// simulate_esp32_payload.js
// =================================================================
// Script para simular el envío de datos desde un dispositivo ESP32
// al endpoint /api/lecturas del backend.
// =================================================================

import axios from 'axios';

// --- Configuración ---
// Asegúrate de que esta URL apunta a tu backend en ejecución.
// Si ejecutas este script en la misma máquina que el servidor, localhost es correcto.
// Se puede apuntar a otro servidor con API_ENDPOINT (p. ej. http://localhost:3000/api/sensor-data).
const API_ENDPOINT = process.env.API_ENDPOINT || 'https://abejanet-backend.onrender.com/api/sensor-data';

// La API key ya NO va escrita en el código (estaba subida a git). Debe ser la ESP32_API_KEY del servidor al que
// le mandas los datos. Ejemplos:
//   PowerShell:  $env:ESP32_API_KEY = '<tu clave>'; node simulate_esp32_payload.js
//   .env local:  node --env-file=.env simulate_esp32_payload.js   (solo sirve contra tu backend local)
const API_KEY = process.env.ESP32_API_KEY;
if (!API_KEY) {
  console.error('Falta la variable de entorno ESP32_API_KEY (ver ejemplos en este archivo).');
  process.exit(1);
}

// Datos de ejemplo que simulan la lectura de un sensor.
// Este es el JSON exacto que enviría un ESP32.
const payload = {
  "mac_address": "A8:03:2A:B4:C1:D1", // Clave correcta
  "temperatura": 27.5,
  "humedad": 68.9,
  "peso": 42.1,
  "sonido": 58.3,
  "lluvia": false,
  "presion": 815.42 // hPa, presión absoluta del BME280 (opcional: sin este campo se guarda NULL)
};

// --- Función de envío ---
const enviarLectura = async () => {
  console.log('Simulando envío de datos desde un ESP32...');
  console.log('URL del Endpoint:', API_ENDPOINT);
  console.log('Payload a enviar:', JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(API_ENDPOINT, payload, {
      timeout: 90000, // 90 segundos de timeout para dar tiempo a Render a despertar
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY // Añadir la cabecera de autenticación
      }
    });

    console.log('\n✅ Éxito: El servidor respondió:');
    console.log('   Status:', response.status);
    console.log('   Data:', response.data);

  } catch (error) {
    console.error('\n❌ Error: No se pudo enviar la lectura.');
    if (error.response) {
      console.error('   El servidor respondió con un error.');
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    } else if (error.request) {
      console.error('   No se recibió respuesta del servidor. ¿Está el backend en ejecución en la URL especificada?');
    } else {
      console.error('   Error de configuración de la solicitud:', error.message);
    }
  }
};

// Ejecutar la simulación
enviarLectura();

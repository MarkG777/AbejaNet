// simulate_esp32_payload.js
// =================================================================
// Script para simular el envío de datos desde un dispositivo ESP32
// al endpoint /api/lecturas del backend.
// =================================================================

import axios from 'axios';

// --- Configuración ---
// Asegúrate de que esta URL apunta a tu backend en ejecución.
// Si ejecutas este script en la misma máquina que el servidor, localhost es correcto.
const API_ENDPOINT = 'http://localhost:3000/api/lecturas';

// Datos de ejemplo que simulan la lectura de un sensor.
// Este es el JSON exacto que enviría un ESP32.
const payload = {
  "macAddress": "A8:03:2A:B4:C1:D0",
  "temperatura": 27.5,
  "humedad": 68.9,
  "peso": 42.1,
  "sonido": 58.3,
  "lluvia": false
};

// --- Función de envío ---
const enviarLectura = async () => {
  console.log('Simulando envío de datos desde un ESP32...');
  console.log('URL del Endpoint:', API_ENDPOINT);
  console.log('Payload a enviar:', JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(API_ENDPOINT, payload, {
      headers: {
        'Content-Type': 'application/json'
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

// EJEMPLO DE CÓDIGO PARA ESP32 - CLIENTE DE ABEJANET
// ========================================================
//
// Este código se conecta a una red WiFi, simula la lectura de sensores
// y envía los datos al backend de AbejaNet de forma segura.
//
// Dependencias:
// 1. Placa ESP32 en el gestor de placas de Arduino IDE.
// 2. Librería "ArduinoJson" de Benoit Blanchon (instalar desde el gestor de librerías).
//
// Configuración:
// - Rellena las variables de la sección "CONFIGURACIÓN REQUERIDA".

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ========================================================
// --- CONFIGURACIÓN REQUERIDA ---
// ========================================================

const char* ssid = "TU_NOMBRE_DE_WIFI";         // El nombre de tu red WiFi
const char* password = "TU_CONTRASENA_WIFI"; // La contraseña de tu red WiFi

// La IP y el puerto de tu servidor backend. 
// Ejemplo: si tu backend corre en 192.168.1.100 en el puerto 3000,
// la URL sería "http://192.168.1.100:3000/api/sensor-data"
// La URL de tu servicio backend en Render. Reemplaza 'nombre-app' por el tuyo.
const char* serverUrl = "https://abejanet-backend.onrender.com/api/sensor-data";

// Tu clave de API secreta (la misma que en el archivo .env del backend)
// Tu clave de API secreta (la misma que en el archivo .env del backend)
const char* apiKey = "abeja-maestra-secreta-777"; 

// Intervalo entre envíos de datos (en milisegundos)
// 600000 ms = 10 minutos
const long interval = 600000; 
unsigned long previousMillis = 0;

// ========================================================

void setup() {
  Serial.begin(115200);
  Serial.println("\n--- AbejaNet ESP32 Client ---");

  // Conectar a WiFi
  // connectToWiFi(); // Desactivado temporalmente para prueba de boot loop
}

void loop() {
  unsigned long currentMillis = millis();

  // Comprobar si es momento de enviar datos
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    // Asegurarse de que estamos conectados a WiFi antes de enviar
    if (WiFi.status() == WL_CONNECTED) {
      sendSensorData();
    } else {
      Serial.println("WiFi desconectado. Intentando reconectar...");
      connectToWiFi();
    }
  }
}

void connectToWiFi() {
  Serial.print("Conectando a ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi conectado!");
    Serial.print("Dirección IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("Dirección MAC: ");
    Serial.println(WiFi.macAddress());
  } else {
    Serial.println("\nNo se pudo conectar a la red WiFi. Reiniciando en 10 segundos...");
    delay(10000);
    ESP.restart();
  }
}

void sendSensorData() {
  // --- 1. Simulación de lectura de sensores ---
  // En un caso real, aquí leerías los datos de tus sensores físicos (DHT22, balanza, etc.)
  float temperatura = random(15, 35) + random(0, 100) / 100.0;
  float humedad = random(40, 80) + random(0, 100) / 100.0;
  float peso = random(10, 25) + random(0, 100) / 100.0;
  float sonido = random(40, 70) + random(0, 100) / 100.0;
  bool lluvia = random(0, 10) < 1; // 10% de probabilidad de lluvia

  // --- 2. Obtener la dirección MAC ---
  String macAddress = WiFi.macAddress();

  // --- 3. Construir el JSON ---
  StaticJsonDocument<256> doc;
  doc["mac_address"] = macAddress;
  doc["temperatura"] = temperatura;
  doc["humedad"] = humedad;
  doc["peso"] = peso;
  doc["sonido"] = sonido;
  doc["lluvia"] = lluvia;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  Serial.println("\n--- Preparando envío de datos ---");
  Serial.print("Payload: ");
  Serial.println(jsonPayload);

  // --- 4. Enviar la petición HTTP POST ---
  HTTPClient http;
  http.begin(serverUrl);
  
  // Añadir las cabeceras necesarias
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", apiKey);

  // Enviar la petición
  int httpResponseCode = http.POST(jsonPayload);

  // --- 5. Manejar la respuesta del servidor ---
  if (httpResponseCode > 0) {
    Serial.print("Código de respuesta HTTP: ");
    Serial.println(httpResponseCode);
    String responsePayload = http.getString();
    Serial.print("Respuesta del servidor: ");
    Serial.println(responsePayload);
  } else {
    Serial.print("Error en la petición HTTP: ");
    Serial.println(http.errorToString(httpResponseCode).c_str());
  }

  http.end();
}

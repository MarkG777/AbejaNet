// ================================================================
// ESP32 - AbejaNet Sensor Client
// MAX4466 + BME280 (temp/humedad/presión) + DHT11 (respaldo) + HX711 → Backend Render
//
// ⚠ BME280: cambio SIN PROBAR en hardware (se escribió sin poder compilar ni flashear).
//   Librerías (Gestor de bibliotecas): "Adafruit BME280 Library" y "Adafruit Unified Sensor".
//   Conexión I2C: VIN→3V3, GND→GND, SDA→GPIO21, SCL→GPIO22 (dirección 0x76 u 0x77, se prueban ambas).
//   Si no encuentra el BME280 el programa sigue funcionando como antes (DHT11) y no manda presión.
// ================================================================

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <DHT.h>
#include "HX711.h"

// WiFi (ssid, password) y apiKey viven en secrets.h (gitignoreado, no se sube
// al repo público). Copia secrets.h.example -> secrets.h y llena tus datos.
#include "secrets.h"

// -------- CONFIGURACIÓN BACKEND --------
const char* serverUrl = "https://abejanet-backend.onrender.com/api/lecturas";

// -------- Micrófono MAX4466 --------
const int ADC_PIN = 34;
const int NSAMPLES = 1024;
const int BAUD = 115200;

void setupADC() {
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  analogSetPinAttenuation(ADC_PIN, ADC_11db);
}

// -------- BME280 (I2C: SDA=21, SCL=22) --------
// Temperatura (°C), humedad (%) y presión ABSOLUTA (hPa; ≈815 en Querétaro, no 1013).
Adafruit_BME280 bme;
bool bmeDisponible = false;

// -------- DHT11 (respaldo si el BME280 no responde) --------
#define DHTPIN 15
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// -------- HX711 --------
#define HX_DT 4      // Data pin
#define HX_SCK 5     // Clock pin

HX711 scale;

// Valor de calibración — AJUSTA ESTE DESPUÉS
float calibration_factor = 433935.00; 

// Filtro del peso
float peso_filtrado = 0;

// -------- Variables de control --------
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 60000; // Enviar cada 60 segundos (1 minuto)

// ================================================================
// SETUP
// ================================================================

void setup() {
  Serial.begin(BAUD);
  delay(200);

  Serial.println("\n\n=================================");
  Serial.println("ESP32 - AbejaNet Sensor Client");
  Serial.println("=================================\n");

  // Configurar sensores
  setupADC();
  dht.begin();

  // BME280: se prueba la dirección 0x76 y luego la 0x77
  Wire.begin();
  bmeDisponible = bme.begin(0x76) || bme.begin(0x77);

  // HX711
  scale.begin(HX_DT, HX_SCK);
  scale.set_scale(calibration_factor);  
  scale.tare();   

  Serial.println("✓ Sensores inicializados");
  Serial.println("  - MAX4466 (Micrófono)");
  Serial.println(bmeDisponible ? "  - BME280 (Temp/Humedad/Presión)" : "  - BME280 NO detectado: se usa solo el DHT11 y no se envía presión");
  Serial.println("  - DHT11 (Temp/Humedad, respaldo)");
  Serial.println("  - HX711 (Peso)\n");

  // Conectar a WiFi
  conectarWiFi();
  
  Serial.println("\n=================================");
  Serial.println("Sistema listo. Iniciando lecturas...");
  Serial.println("=================================\n");
  
  delay(1000);
}

// ================================================================
// LOOP
// ================================================================

void loop() {

  // ---------- Max4466 ----------
  static uint16_t raw[NSAMPLES];
  uint32_t sum = 0;

  for (int i = 0; i < NSAMPLES; i++) {
    uint16_t v = analogRead(ADC_PIN);
    raw[i] = v;
    sum += v;
  }

  float mean = sum / (float)NSAMPLES;

  float sumsq = 0.0f;
  uint16_t vmin = 4095, vmax = 0;

  for (int i = 0; i < NSAMPLES; i++) {
    uint16_t v = raw[i];
    if (v < vmin) vmin = v;
    if (v > vmax) vmax = v;
    float ac = v - mean;
    sumsq += ac * ac;
  }

  float vrms_counts = sqrtf(sumsq / (float)NSAMPLES);
  const float FS_SINE_RMS = (2047.0f / 1.4142f);
  float dbfs = 20.0f * log10f((vrms_counts + 1e-9) / FS_SINE_RMS);

  // ---------- BME280 (principal) y DHT11 (respaldo) ----------
  float t = NAN, h = NAN, presion = NAN;
  if (bmeDisponible) {
    t = bme.readTemperature();
    h = bme.readHumidity();
    presion = bme.readPressure() / 100.0F;  // Pa → hPa
    // El backend solo acepta 300–1100 hPa; fuera de ese rango es una lectura inválida
    if (!(presion >= 300.0F && presion <= 1100.0F)) presion = NAN;
  }
  // El DHT11 solo se consulta si el BME280 no dio el dato (es lento: ~250 ms)
  if (isnan(t)) t = dht.readTemperature();
  if (isnan(h)) h = dht.readHumidity();

  // ---------- HX711 Peso ----------
  float lectura_raw = scale.get_units(1);  
  peso_filtrado = 0.90 * peso_filtrado + 0.10 * lectura_raw;  
  float peso = peso_filtrado;

  // ---------- Output Serial ----------
  Serial.print("dBFS=");
  Serial.print(dbfs, 1);

  if (!isnan(t) && !isnan(h)) {
    Serial.print(" | Temp=");
    Serial.print(t);
    Serial.print("°C | Hum=");
    Serial.print(h);
    Serial.print("%");
  } else {
    Serial.print(" | Temp/Hum Error");
  }

  if (!isnan(presion)) {
    Serial.print(" | Presion=");
    Serial.print(presion, 1);
    Serial.print(" hPa");
  }

  Serial.print(" | Peso=");
  Serial.print(peso, 2);
  Serial.print(" kg");

  Serial.println();

  // ---------- Enviar al servidor cada 60 segundos ----------
  unsigned long currentTime = millis();
  if (currentTime - lastSendTime >= sendInterval) {
    lastSendTime = currentTime;
    
    // Verificar WiFi
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("\n⚠ WiFi desconectado. Intentando reconectar...");
      conectarWiFi();
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      enviarDatos(dbfs, t, h, peso, presion);
    }
  }

  delay(500);
}

// ================================================================
// FUNCIÓN: Conectar WiFi
// ================================================================

void conectarWiFi() {
  Serial.print("Conectando a WiFi: ");
  Serial.println(ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 20) {
    delay(500);
    Serial.print(".");
    intentos++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi conectado");
    Serial.print("  IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("  MAC: ");
    Serial.println(WiFi.macAddress());
  } else {
    Serial.println("\n✗ Error: No se pudo conectar a WiFi");
    Serial.println("  Verifica SSID y contraseña");
  }
}

// ================================================================
// FUNCIÓN: Enviar datos al backend
// ================================================================

// Número como texto JSON; un valor no disponible (NaN) viaja como null, porque "nan" no es JSON válido
String numeroJson(float valor, int decimales) {
  return isnan(valor) ? String("null") : String(valor, decimales);
}

void enviarDatos(float sonido, float temperatura, float humedad, float peso, float presion) {
  HTTPClient http;
  
  Serial.println("\n--- Enviando datos al servidor ---");
  
  // Obtener MAC address del ESP32
  String macAddress = WiFi.macAddress();
  
  // Construir JSON payload
  String jsonPayload = "{";
  jsonPayload += "\"macAddress\":\"" + macAddress + "\",";
  jsonPayload += "\"sonido\":" + numeroJson(sonido, 2) + ",";
  jsonPayload += "\"temperatura\":" + numeroJson(temperatura, 2) + ",";
  jsonPayload += "\"humedad\":" + numeroJson(humedad, 2) + ",";
  jsonPayload += "\"peso\":" + numeroJson(peso, 2) + ",";
  jsonPayload += "\"presion\":" + numeroJson(presion, 2) + ",";  // hPa (null si no hay BME280)
  jsonPayload += "\"lluvia\":false";  // Actualmente no tienes sensor de lluvia
  jsonPayload += "}";
  
  Serial.println("Payload:");
  Serial.println(jsonPayload);
  
  // Configurar HTTP request
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", apiKey);

  // Enviar POST request
  int httpResponseCode = http.POST(jsonPayload);
  
  // Verificar respuesta
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("✓ Código HTTP: ");
    Serial.println(httpResponseCode);
    Serial.print("  Respuesta: ");
    Serial.println(response);
    
    if (httpResponseCode == 201) {
      Serial.println("✓ Datos enviados exitosamente");
    }
  } else {
    Serial.print("✗ Error en la petición HTTP: ");
    Serial.println(http.errorToString(httpResponseCode).c_str());
  }
  
  http.end();
  Serial.println("----------------------------------\n");
}

// ================================================================
// FIN DEL CÓDIGO
// ================================================================

// ================================================================
// ESP32 - AbejaNet Sensor Client
// MAX4466 + DHT11 + HX711 → Backend Render
// ================================================================

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include "HX711.h"

// -------- CONFIGURACIÓN WIFI --------
const char* ssid = "TU_WIFI_AQUI";           // ← CAMBIAR: Nombre de tu red WiFi
const char* password = "TU_PASSWORD_AQUI";   // ← CAMBIAR: Contraseña de tu WiFi

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

// -------- DHT11 --------
#define DHTPIN 15 
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// -------- HX711 --------
#define HX_DT 22     // Data pin
#define HX_SCK 21    // Clock pin

HX711 scale;

// Valor de calibración — AJUSTA ESTE DESPUÉS
float calibration_factor = -7050.0; 

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

  // HX711
  scale.begin(HX_DT, HX_SCK);
  scale.set_scale(calibration_factor);  
  scale.tare();   

  Serial.println("✓ Sensores inicializados");
  Serial.println("  - MAX4466 (Micrófono)");
  Serial.println("  - DHT11 (Temp/Humedad)");
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

  // ---------- DHT11 ----------
  float h = dht.readHumidity();
  float t = dht.readTemperature();

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
    Serial.print(" | DHT11 Error");
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
      enviarDatos(dbfs, t, h, peso);
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

void enviarDatos(float sonido, float temperatura, float humedad, float peso) {
  HTTPClient http;
  
  Serial.println("\n--- Enviando datos al servidor ---");
  
  // Obtener MAC address del ESP32
  String macAddress = WiFi.macAddress();
  
  // Construir JSON payload
  String jsonPayload = "{";
  jsonPayload += "\"macAddress\":\"" + macAddress + "\",";
  jsonPayload += "\"sonido\":" + String(sonido, 2) + ",";
  jsonPayload += "\"temperatura\":" + String(temperatura, 2) + ",";
  jsonPayload += "\"humedad\":" + String(humedad, 2) + ",";
  jsonPayload += "\"peso\":" + String(peso, 2) + ",";
  jsonPayload += "\"lluvia\":false";  // Actualmente no tienes sensor de lluvia
  jsonPayload += "}";
  
  Serial.println("Payload:");
  Serial.println(jsonPayload);
  
  // Configurar HTTP request
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
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

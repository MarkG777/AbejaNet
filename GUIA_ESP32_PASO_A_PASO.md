# 📡 Guía Paso a Paso: ESP32 → Backend Render

## 🎯 Objetivo
Conectar tu ESP32 con sensores (MAX4466, DHT11, HX711) al backend en Render para registrar lecturas automáticamente.

---

## ✅ **PASO 1: Configurar el Sketch**

### 1.1 Abrir el archivo
Abre `ESP32_AbejaNet_Completo.ino` en Arduino IDE

### 1.2 Modificar WiFi (LÍNEAS 15-16)
```cpp
const char* ssid = "TU_WIFI_AQUI";           // ← Nombre de tu red WiFi
const char* password = "TU_PASSWORD_AQUI";   // ← Contraseña
```

**Ejemplo:**
```cpp
const char* ssid = "MiCasaWiFi";
const char* password = "MiPassword123";
```

### 1.3 Verificar URL del Backend (LÍNEA 19)
```cpp
const char* serverUrl = "https://abejanet-backend.onrender.com/api/lecturas";
```

✅ **NO MODIFICAR** esta línea (ya está correcta para tu backend en Render)

---

## ✅ **PASO 2: Instalar Librerías (Si No Las Tienes)**

En Arduino IDE:
1. Ve a **Herramientas → Administrar Bibliotecas**
2. Busca e instala:
   - `DHT sensor library` by Adafruit
   - `HX711 Arduino Library` by Bogdan Necula

---

## ✅ **PASO 3: Cargar el Sketch al ESP32**

1. Conecta el ESP32 por USB
2. Selecciona:
   - **Herramientas → Placa → ESP32 Dev Module** (o tu modelo)
   - **Herramientas → Puerto → COM#** (el que aparezca)
3. Click en **→** (Subir)
4. Espera a que termine la carga

---

## ✅ **PASO 4: Abrir Monitor Serial**

1. Click en **🔍** (Monitor Serial) en Arduino IDE
2. Configura **115200 baud** (abajo a la derecha)
3. Deberías ver:

```
=================================
ESP32 - AbejaNet Sensor Client
=================================

✓ Sensores inicializados
  - MAX4466 (Micrófono)
  - DHT11 (Temp/Humedad)
  - HX711 (Peso)

Conectando a WiFi: TuWiFi
..........
✓ WiFi conectado
  IP: 192.168.1.100
  MAC: AA:BB:CC:DD:EE:FF

=================================
Sistema listo. Iniciando lecturas...
=================================

dBFS=-45.2 | Temp=25.3°C | Hum=68.5% | Peso=15.23 kg
```

---

## ✅ **PASO 5: Verificar Envío de Datos (Cada 60 segundos)**

Después de 1 minuto, deberías ver:

```
--- Enviando datos al servidor ---
Payload:
{"macAddress":"AA:BB:CC:DD:EE:FF","sonido":-45.20,"temperatura":25.30,"humedad":68.50,"peso":15.23,"lluvia":false}
✓ Código HTTP: 201
  Respuesta: {"success":true,"message":"Nuevo sensor registrado y primera lectura guardada con éxito.","sensorId":10}
✓ Datos enviados exitosamente
----------------------------------
```

---

## ✅ **PASO 6: Verificar en la Base de Datos**

### Opción A: Desde el Navegador

Abre tu navegador y ve a:
```
https://abejanet-backend.onrender.com/debug/data
```

Busca:
```json
{
  "totales": {
    "sensores": "6",  ← Debería aumentar con tu nuevo sensor
    "lecturas_ambientales": "2885"  ← Debería aumentar cada minuto
  }
}
```

### Opción B: Desde PowerShell

```powershell
Invoke-WebRequest -Uri "https://abejanet-backend.onrender.com/debug/data" | Select-Object -ExpandProperty Content
```

---

## ✅ **PASO 7: Ver el Sensor en la App Móvil**

**NOTA:** El sensor se creará con estado **"no_asignado"** y **sin colmena**.

Para asignarlo a una colmena:

1. Un administrador debe ir a DBeaver o ejecutar:
```sql
UPDATE sensores 
SET colmena_id = 1, estado = 'activo' 
WHERE mac_address = 'AA:BB:CC:DD:EE:FF';  -- Reemplaza con tu MAC
```

2. Después, el usuario verá las lecturas en la app móvil.

---

## 🔧 **SOLUCIÓN DE PROBLEMAS**

### ❌ Problema 1: No se conecta al WiFi
```
✗ Error: No se pudo conectar a WiFi
```

**Solución:**
- Verifica el nombre del WiFi (ssid) y contraseña
- Asegúrate de que el ESP32 esté cerca del router
- Verifica que la red sea 2.4GHz (el ESP32 no soporta 5GHz)

---

### ❌ Problema 2: Error HTTP 400
```
✗ Código HTTP: 400
```

**Solución:**
- El servidor rechazó los datos
- Verifica que el JSON tenga el campo `macAddress`
- Abre el Monitor Serial y copia el "Payload" exacto
- Revisa que los valores no sean `NaN` (not a number)

---

### ❌ Problema 3: Error HTTP 403
```
✗ Código HTTP: 403
  Respuesta: {"success":false,"message":"El sensor con MAC ... no está activo"}
```

**Solución:**
- El sensor existe pero está inactivo
- Ejecuta en la base de datos:
```sql
UPDATE sensores SET estado = 'activo' WHERE mac_address = 'TU_MAC_AQUI';
```

---

### ❌ Problema 4: Error HTTP 500
```
✗ Código HTTP: 500
```

**Solución:**
- Error interno del servidor
- Verifica los logs del backend en Render
- Puede ser un problema temporal, espera 1 minuto y reintenta

---

### ❌ Problema 5: DHT11 Error
```
dBFS=-45.2 | DHT11 Error | Peso=15.23 kg
```

**Solución:**
- Verifica las conexiones del DHT11
- Asegúrate de que esté conectado al pin 15
- Verifica la alimentación (3.3V o 5V según tu módulo)

---

## 📊 **INTERVALOS DE ENVÍO**

El ESP32 envía datos cada **60 segundos** (1 minuto).

Para cambiar este intervalo, modifica la línea 44:
```cpp
const unsigned long sendInterval = 60000; // En milisegundos
```

**Ejemplos:**
- 30 segundos: `30000`
- 2 minutos: `120000`
- 5 minutos: `300000`

**RECOMENDACIÓN:** No envíes más frecuente que cada 30 segundos para no saturar el servidor.

---

## 🎯 **FLUJO COMPLETO**

1. ✅ ESP32 lee sensores cada 500ms (0.5 segundos)
2. ✅ Muestra datos en Monitor Serial constantemente
3. ✅ Cada 60 segundos envía al backend
4. ✅ Backend verifica si el sensor existe (por MAC)
5. ✅ Si NO existe → Lo crea con estado "no_asignado"
6. ✅ Si existe → Verifica que esté "activo"
7. ✅ Guarda la lectura en `lecturas_ambientales`
8. ✅ Actualiza `ultima_lectura_en` del sensor

---

## 📝 **NOTAS IMPORTANTES**

1. **MAC Address:** Se obtiene automáticamente del ESP32 (WiFi.macAddress())
2. **Estado inicial:** "no_asignado" (sin colmena)
3. **Lluvia:** Actualmente se envía `false` (no tienes sensor de lluvia)
4. **Calibración:** Ajusta `calibration_factor` del HX711 según tu báscula

---

## 🆘 **¿Necesitas Ayuda?**

Si algo no funciona:
1. Copia el texto COMPLETO del Monitor Serial
2. Toma captura de pantalla
3. Envíame los logs del backend en Render (si los tienes)

---

## ✅ **CHECKLIST FINAL**

Antes de probar, verifica:

- [ ] WiFi configurado correctamente (ssid + password)
- [ ] URL del backend correcta
- [ ] Librerías DHT y HX711 instaladas
- [ ] ESP32 conectado por USB
- [ ] Puerto COM correcto seleccionado
- [ ] Monitor Serial abierto a 115200 baud
- [ ] Sensores conectados correctamente (pines 15, 22, 21, 34)

---

**¡Listo! Sigue los pasos y tu ESP32 estará enviando datos al backend.** 🚀

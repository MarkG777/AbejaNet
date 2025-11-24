# Instrucciones para Ejecutar Setup de Base de Datos

## Si tienes Shell en Render:

```bash
node setup_database_once.js
```

## Si NO tienes Shell en Render:

### 1. Agregar endpoint temporal al final de index.js (antes de app.listen):

```javascript
// ENDPOINT TEMPORAL - ELIMINAR DESPUÉS DE USAR
app.get('/SETUP-DATABASE-NOW', async (req, res) => {
  const { spawn } = await import('child_process');
  const setupProcess = spawn('node', ['setup_database_once.js']);
  
  let output = '';
  setupProcess.stdout.on('data', (data) => { output += data.toString(); });
  setupProcess.stderr.on('data', (data) => { output += data.toString(); });
  
  setupProcess.on('close', (code) => {
    res.send(`<pre>${output}</pre>`);
  });
});
```

### 2. Hacer commit y push

### 3. Esperar redespliegue

### 4. Abrir en navegador:
```
https://abejanet-backend.onrender.com/SETUP-DATABASE-NOW
```

### 5. INMEDIATAMENTE eliminar el endpoint y hacer push de nuevo

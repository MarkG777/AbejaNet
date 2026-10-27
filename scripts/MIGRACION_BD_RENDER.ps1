# ================================================================
# SCRIPT PARA MIGRACION DE BASE DE DATOS EN RENDER
# ================================================================
# Ejecuta este script cuando tu BD gratuita expire.
# Este script configura automaticamente la nueva BD.

$BackendURL = "https://abejanet-backend.onrender.com"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   MIGRACION DE BASE DE DATOS - RENDER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Pedir datos de la nueva BD
Write-Host "Paso 1: Informacion de la Nueva Base de Datos" -ForegroundColor Yellow
Write-Host "   (Copia estos valores desde Render Dashboard)"
Write-Host ""

$NewDatabaseURL = Read-Host "Internal Database URL completa"

# Extraer informacion de la URL para verificar
if ($NewDatabaseURL -match "postgresql://([^:]+):([^@]+)@([^/]+)/(.+)") {
    $Username = $Matches[1]
    $Password = $Matches[2]
    $DbHost = $Matches[3]
    $Database = $Matches[4]

    Write-Host ""
    Write-Host "OK - Informacion extraida:" -ForegroundColor Green
    Write-Host "   Usuario: $Username"
    Write-Host "   Host: $DbHost"
    Write-Host "   Base de datos: $Database"
    Write-Host ""
}
else {
    Write-Host ""
    Write-Host "ERROR: URL no valida" -ForegroundColor Red
    exit 1
}

# 2. Confirmar cambios
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Yellow
Write-Host "   1. Actualiza DATABASE_URL en Render Environment con:"
Write-Host "      $NewDatabaseURL" -ForegroundColor Cyan
Write-Host "   2. Espera a que el backend redespliegue (2-3 min)"
Write-Host "   3. Presiona Enter cuando este listo"
Write-Host ""
pause

# 3. Verificar conexion
Write-Host ""
Write-Host "Paso 2: Verificando conexion..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BackendURL/test-db" -UseBasicParsing
    $result = $response.Content | ConvertFrom-Json
    if ($result.success) {
        Write-Host "OK - Backend conectado a la BD correctamente" -ForegroundColor Green
        Write-Host ""
    }
    else {
        Write-Host "ERROR: Backend no puede conectarse a la BD" -ForegroundColor Red
        Write-Host "   Verifica que DATABASE_URL este actualizada"
        Write-Host ""
        exit 1
    }
}
catch {
    Write-Host "ERROR: No se pudo conectar con el backend" -ForegroundColor Red
    Write-Host "   Verifica que el backend este en estado 'Live'"
    Write-Host ""
    exit 1
}

# 4. Ejecutar setup
Write-Host "Paso 3: Configurando base de datos..." -ForegroundColor Yellow
Write-Host "   (Esto puede tardar 1-2 minutos)"
Write-Host ""

# Pedir clave secreta
$Secret = Read-Host "Clave secreta (SETUP_SECRET de Environment)"

$body = @{
    secret = $Secret
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$BackendURL/debug/setup-database" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    $result = $response.Content | ConvertFrom-Json

    if ($result.success) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "   MIGRACION COMPLETADA EXITOSAMENTE" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""

        Write-Host "Tablas creadas:" -ForegroundColor Cyan
        $result.tables | ForEach-Object { Write-Host "   - $_" }

        Write-Host ""
        Write-Host "Datos insertados:" -ForegroundColor Cyan
        Write-Host "   - Usuarios: $($result.data.usuarios)"
        Write-Host "   - Apiarios: $($result.data.apiarios)"
        Write-Host "   - Colmenas: $($result.data.colmenas)"
        Write-Host "   - Sensores: $($result.data.sensores)"

        Write-Host ""
        Write-Host "Todo listo. Tu aplicacion esta funcionando con la nueva BD." -ForegroundColor Green
        Write-Host ""
    }
    else {
        Write-Host ""
        Write-Host "ERROR: $($result.message)" -ForegroundColor Red
        Write-Host ""
        exit 1
    }
}
catch {
    Write-Host ""
    Write-Host "ERROR al ejecutar setup:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)"
    Write-Host ""
    exit 1
}

# 5. Verificar endpoints
Write-Host "Paso 4: Verificando endpoints..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BackendURL/debug/data" -UseBasicParsing
    Write-Host "OK - /debug/data funciona correctamente" -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host "Advertencia: /debug/data no responde" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "         MIGRACION FINALIZADA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

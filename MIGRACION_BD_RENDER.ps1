# ================================================================
# SCRIPT PARA MIGRACIÓN DE BASE DE DATOS EN RENDER
# ================================================================
# Ejecuta este script cuando tu BD gratuita expire.
# Este script configura automáticamente la nueva BD.

$BackendURL = "https://abejanet-backend.onrender.com"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   MIGRACIÓN DE BASE DE DATOS - RENDER" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Pedir datos de la nueva BD
Write-Host "📋 Paso 1: Información de la Nueva Base de Datos" -ForegroundColor Yellow
Write-Host "   (Copia estos valores desde Render Dashboard)`n"

$NewDatabaseURL = Read-Host "Internal Database URL completa"

# Extraer información de la URL para verificar
if ($NewDatabaseURL -match "postgresql://([^:]+):([^@]+)@([^/]+)/(.+)") {
    $Username = $Matches[1]
    $Password = $Matches[2]
    $Host = $Matches[3]
    $Database = $Matches[4]
    
    Write-Host "`n✅ Información extraída:" -ForegroundColor Green
    Write-Host "   Usuario: $Username"
    Write-Host "   Host: $Host"
    Write-Host "   Base de datos: $Database"
    Write-Host ""
} else {
    Write-Host "`n❌ Error: URL no válida" -ForegroundColor Red
    exit 1
}

# 2. Confirmar cambios
Write-Host "`n⚠️  IMPORTANTE:" -ForegroundColor Yellow
Write-Host "   1. Actualiza DATABASE_URL en Render Environment con:"
Write-Host "      $NewDatabaseURL" -ForegroundColor Cyan
Write-Host "   2. Espera a que el backend redespliegue (2-3 min)"
Write-Host "   3. Presiona Enter cuando esté listo`n"
pause

# 3. Verificar conexión
Write-Host "`n🔍 Paso 2: Verificando conexión..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BackendURL/test-db" -UseBasicParsing
    $result = $response.Content | ConvertFrom-Json
    if ($result.success) {
        Write-Host "✅ Backend conectado a la BD correctamente`n" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend no puede conectarse a la BD" -ForegroundColor Red
        Write-Host "   Verifica que DATABASE_URL esté actualizada`n"
        exit 1
    }
} catch {
    Write-Host "❌ Error al conectar con el backend" -ForegroundColor Red
    Write-Host "   Verifica que el backend esté en estado 'Live'`n"
    exit 1
}

# 4. Ejecutar setup
Write-Host "🚀 Paso 3: Configurando base de datos..." -ForegroundColor Yellow
Write-Host "   (Esto puede tardar 1-2 minutos)`n"

# Pedir clave secreta
$Secret = Read-Host "Clave secreta (SETUP_SECRET de Environment)"

$body = @{
    secret = $Secret
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$BackendURL/debug/setup-database" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.success) {
        Write-Host "`n========================================" -ForegroundColor Green
        Write-Host "   ✅ MIGRACIÓN COMPLETADA EXITOSAMENTE" -ForegroundColor Green
        Write-Host "========================================`n" -ForegroundColor Green
        
        Write-Host "📊 Tablas creadas:" -ForegroundColor Cyan
        $result.tables | ForEach-Object { Write-Host "   - $_" }
        
        Write-Host "`n📈 Datos insertados:" -ForegroundColor Cyan
        Write-Host "   - Usuarios: $($result.data.usuarios)"
        Write-Host "   - Apiarios: $($result.data.apiarios)"
        Write-Host "   - Colmenas: $($result.data.colmenas)"
        Write-Host "   - Sensores: $($result.data.sensores)"
        
        Write-Host "`n✅ Todo listo. Tu aplicación está funcionando con la nueva BD.`n" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Error: $($result.message)`n" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`n❌ Error al ejecutar setup:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)`n"
    exit 1
}

# 5. Verificar endpoints
Write-Host "🔍 Paso 4: Verificando endpoints..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BackendURL/debug/data" -UseBasicParsing
    Write-Host "✅ /debug/data funciona correctamente`n" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Advertencia: /debug/data no responde`n" -ForegroundColor Yellow
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "         MIGRACIÓN FINALIZADA" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

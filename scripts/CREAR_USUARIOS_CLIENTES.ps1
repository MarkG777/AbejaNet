# ================================================================
# Script para Asignar Usuarios a Apiarios - AbejaNet
# ================================================================
# 
# FLUJO RECOMENDADO:
# 1. El usuario se registra PRIMERO en la app móvil
# 2. DESPUÉS ejecutas este script para asignarle un apiario
# 
# INSTRUCCIONES:
# 1. Modifica los correos y nombres de apiarios según necesites
# 2. Ejecuta el bloque completo o solo el que necesites
# 3. Copia y pega en PowerShell
#
# ================================================================

# ----------------------------------------------------------------
# EJEMPLO 1: Asignar UN solo usuario a un apiario
# ----------------------------------------------------------------

$body = @{
    correo_usuario = "zoevelaz@outlook.com"          # ← CAMBIAR: Email del usuario (YA registrado en la app)
    nombre_apiario = "Apiario Principal"             # ← CAMBIAR: Nombre del apiario
    correo_admin = "admin@abejanet.com"              # ← OPCIONAL: Admin que asigna (por defecto es admin@abejanet.com)
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://abejanet-backend.onrender.com/debug/assign-users" -Method POST -Body $body -ContentType "application/json"


# ----------------------------------------------------------------
# EJEMPLO 2: Asignar VARIOS usuarios de una sola vez
# ----------------------------------------------------------------

$body = @(
    @{
        correo_usuario = "orlando@gmail.com"
        nombre_apiario = "Apiario Secundario del Laboratorio"
    },
    @{
        correo_usuario = "2023371124@uteq.edu.mx"
        nombre_apiario = "Apiario Principal"
    },
    @{
        correo_usuario = "alejandra1234@gmail.com"
        nombre_apiario = "Apiario Secundario del Laboratorio"
    }
) | ConvertTo-Json

Invoke-WebRequest -Uri "https://abejanet-backend.onrender.com/debug/assign-users" -Method POST -Body $body -ContentType "application/json"


# ----------------------------------------------------------------
# EJEMPLO 3: Asignar al mismo usuario a MÚLTIPLES apiarios
# ----------------------------------------------------------------

$body = @(
    @{
        correo_usuario = "2023371124@uteq.edu.mx"
        nombre_apiario = "Apiario Principal"
    },
    @{
        correo_usuario = "2023371124@uteq.edu.mx"
        nombre_apiario = "Apiario Secundario del Laboratorio"
    }
) | ConvertTo-Json

Invoke-WebRequest -Uri "https://abejanet-backend.onrender.com/debug/assign-users" -Method POST -Body $body -ContentType "application/json"


# ================================================================
# PLANTILLA EN BLANCO - UN USUARIO
# ================================================================

<#
$body = @{
    correo_usuario = "TU_EMAIL_AQUI@gmail.com"
    nombre_apiario = "Apiario Principal"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://abejanet-backend.onrender.com/debug/assign-users" -Method POST -Body $body -ContentType "application/json"
#>


# ================================================================
# PLANTILLA EN BLANCO - VARIOS USUARIOS
# ================================================================

<#
$body = @(
    @{
        correo_usuario = "usuario1@gmail.com"
        nombre_apiario = "Apiario Principal"
    },
    @{
        correo_usuario = "usuario2@gmail.com"
        nombre_apiario = "Apiario Secundario del Laboratorio"
    }
) | ConvertTo-Json

Invoke-WebRequest -Uri "https://abejanet-backend.onrender.com/debug/assign-users" -Method POST -Body $body -ContentType "application/json"
#>


# ================================================================
# NOTAS IMPORTANTES
# ================================================================
#
# 1. Apiarios disponibles:
#    - "Apiario Principal"
#    - "Apiario Secundario del Laboratorio"
#
# 2. El usuario DEBE estar registrado primero en la app móvil
#    (si no, el script te dirá que el usuario no existe)
#
# 3. Si el usuario ya está asignado, no lo duplica (lo informa)
#
# 4. Puedes asignar varios usuarios a la vez (ver EJEMPLO 2)
#
# 5. Un usuario puede estar asignado a múltiples apiarios (ver EJEMPLO 3)
#
# 6. Para verificar las asignaciones, ve a:
#    https://abejanet-backend.onrender.com/debug/data
#    (busca el campo "usuarios_apiarios")
#
# 7. El usuario podrá ver SOLO los apiarios asignados en la app móvil
#
# ================================================================

# Convierte los HTML de los diagramas a PNG usando Edge headless.
# Uso: powershell -ExecutionPolicy Bypass -File generar_pngs.ps1

$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$imagesOut = Join-Path (Split-Path -Parent $here) "images"

if (-not (Test-Path $imagesOut)) {
    New-Item -ItemType Directory -Path $imagesOut | Out-Null
}

$edgePaths = @(
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)
$edge = $null
foreach ($p in $edgePaths) {
    if (Test-Path $p) {
        $edge = $p
        break
    }
}
if (-not $edge) {
    Write-Error "No se encontro msedge.exe."
    exit 1
}

$diagrams = @(
    @{ html = "rqf03_validacion.html"; png = "rqf03_validacion.png"; w = 1180; h = 800 },
    @{ html = "rqf04_offline.html";    png = "rqf04_offline.png";    w = 1180; h = 800 },
    @{ html = "rqf05_bitacora.html";   png = "rqf05_bitacora.png";   w = 1280; h = 860 }
)

foreach ($d in $diagrams) {
    $htmlPath = Join-Path $here $d.html
    $pngPath  = Join-Path $imagesOut $d.png
    $uri = "file:///" + ($htmlPath -replace '\\','/')

    Write-Host ("Renderizando " + $d.html + " -> " + $d.png) -ForegroundColor Cyan

    $edgeArgs = @(
        "--headless",
        "--disable-gpu",
        "--hide-scrollbars",
        ("--window-size=" + $d.w + "," + $d.h),
        ("--screenshot=" + $pngPath),
        $uri
    )

    Start-Process -FilePath $edge -ArgumentList $edgeArgs -Wait -NoNewWindow

    if (Test-Path $pngPath) {
        Write-Host ("  OK  " + $pngPath) -ForegroundColor Green
    } else {
        Write-Warning ("  FALLO generacion de " + $pngPath)
    }
}

Write-Host ""
Write-Host ("Diagramas PNG generados en: " + $imagesOut) -ForegroundColor Yellow

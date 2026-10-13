# Script de compilación LaTeX para Windows
# Uso: powershell -ExecutionPolicy Bypass -File compilar.ps1
# Genera primero los PNG de los diagramas y luego compila el PDF.

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Compilando — AbejaNet Móvil (Mejoras)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

# 1) Generar los PNG de los diagramas si no existen
$generador = Join-Path $here "diagramas\generar_pngs.ps1"
if (Test-Path $generador) {
    Write-Host "Generando diagramas PNG..." -ForegroundColor Cyan
    & powershell -ExecutionPolicy Bypass -File $generador
}

# 2) Compilar LaTeX (dos pasadas para referencias)
$texFile = "main.tex"
$pdfFile = "main.pdf"

if (-not (Test-Path $texFile)) {
    Write-Error "No se encontró $texFile."
    exit 1
}

Write-Host "Primera pasada pdflatex..." -ForegroundColor Cyan
pdflatex -interaction=nonstopmode -halt-on-error $texFile

Write-Host "Segunda pasada (referencias)..." -ForegroundColor Cyan
pdflatex -interaction=nonstopmode -halt-on-error $texFile

if (Test-Path $pdfFile) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "PDF generado: $pdfFile" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Error "La compilación falló. Revisa main.log."
    exit 1
}

$ErrorActionPreference = "SilentlyContinue"
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

Set-Location $projectRoot

Write-Host ""
Write-Host "=== Deteniendo Razzia Hosting ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Deteniendo Docker..." -ForegroundColor Yellow
docker compose down 2>$null
Write-Host "Docker detenido" -ForegroundColor Green

Write-Host ""
Write-Host "[2/3] Deteniendo Caddy..." -ForegroundColor Yellow
Get-Process caddy -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "Caddy detenido" -ForegroundColor Green

Write-Host ""
Write-Host "[3/3] playit..." -ForegroundColor Yellow
Write-Host "playit se deja corriendo (servicio en segundo plano)." -ForegroundColor DarkGray
Write-Host "Para detenerlo:  Stop-Service playitd  (como admin)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Todo detenido." -ForegroundColor Green
Write-Host ""

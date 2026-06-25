$ErrorActionPreference = "Stop"
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$caddyScript = Join-Path $projectRoot "deploy\caddy\start-caddy.ps1"
$playitExe = "C:\Program Files\playit_gg\bin\playit.exe"
$domainFile = Join-Path $projectRoot "deploy\caddy\domain.txt"

Set-Location $projectRoot

function Test-PortListening([int]$Port) {
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

Write-Host ""
Write-Host "=== Razzia Hosting ===" -ForegroundColor Cyan
Write-Host ""

# 1. playit
Write-Host "[1/3] Iniciando playit..." -ForegroundColor Yellow
$playitService = Get-Service -Name "playitd" -ErrorAction SilentlyContinue
if ($playitService) {
    if ($playitService.Status -ne "Running") {
        Start-Service playitd
        Start-Sleep -Seconds 2
    }
    Write-Host "playit OK (servicio playitd activo)" -ForegroundColor Green
} elseif (Test-Path $playitExe) {
    $playitOut = & $playitExe start 2>&1 | Out-String
    if ($playitOut -match "started|running") {
        Write-Host "playit OK" -ForegroundColor Green
    } else {
        Write-Host $playitOut.Trim()
    }
} else {
    Write-Host "playit no encontrado. Instalalo desde https://playit.gg/download" -ForegroundColor Red
}

# 2. Docker / Razzia
Write-Host ""
Write-Host "[2/3] Levantando Razzia (Docker)..." -ForegroundColor Yellow
docker compose up -d
if ($LASTEXITCODE -ne 0) { throw "Docker compose fallo. ¿Docker Desktop esta abierto?" }

$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        if ((Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch { }
    Start-Sleep -Seconds 1
}
if ($ready) { Write-Host "Razzia OK en http://localhost:3000" -ForegroundColor Green }
else { Write-Host "Razzia tardo en responder. Revisa: docker compose logs" -ForegroundColor Yellow }

# 3. Caddy
Write-Host ""
Write-Host "[3/3] Iniciando Caddy (SSL)..." -ForegroundColor Yellow
$domain = (Get-Content $domainFile -Raw).Trim()
$caddyRunning = (Get-Process caddy -ErrorAction SilentlyContinue) -and (Test-PortListening 443)

if ($caddyRunning) {
    Write-Host "Caddy ya esta corriendo en el puerto 443" -ForegroundColor Green
} else {
    Write-Host "Se abrira Caddy con permisos de admin (UAC). ACEPTA el popup." -ForegroundColor Cyan
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$caddyScript`""

    $caddyReady = $false
    for ($i = 0; $i -lt 45; $i++) {
        if (Test-PortListening 443) { $caddyReady = $true; break }
        Start-Sleep -Seconds 1
    }
    if ($caddyReady) {
        Write-Host "Caddy OK en puerto 443" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "Caddy NO arranco. Sin Caddy, playit da error en puerto 443." -ForegroundColor Red
        Write-Host "Ejecuta manualmente: deploy\caddy\start-caddy.ps1  (y acepta UAC)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Listo para jugar:" -ForegroundColor Green
Write-Host "  https://$domain" -ForegroundColor White
Write-Host "  https://$domain/manager" -ForegroundColor White
Write-Host "  Password: ver config/game.json" -ForegroundColor DarkGray
Write-Host ""

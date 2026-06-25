$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$domainFile = Join-Path $root "domain.txt"
$caddyExe = Join-Path $root "caddy.exe"
$caddyfile = Join-Path $root "Caddyfile"

if (-not (Test-Path $caddyExe)) {
    Write-Host "No se encontro caddy.exe en $root" -ForegroundColor Red
    exit 1
}

$domain = (Get-Content $domainFile -Raw).Trim()
if ([string]::IsNullOrWhiteSpace($domain) -or $domain -like "*CAMBIAR*") {
    Write-Host "Edita deploy/caddy/domain.txt con tu dominio (ej: quiz.midominio.com)" -ForegroundColor Yellow
    exit 1
}

@"
$domain {
    reverse_proxy localhost:3000
}
"@ | Set-Content -Path $caddyfile -Encoding UTF8

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Caddy necesita permisos de administrador (puerto 443). Reiniciando elevado..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$PSCommandPath`""
    exit 0
}

Write-Host "Dominio: $domain" -ForegroundColor Green
Write-Host "Proxy -> http://localhost:3000" -ForegroundColor Green
Write-Host "Asegurate de tener Docker (razzia) y playit corriendo." -ForegroundColor Cyan
Write-Host ""

Set-Location $root
& $caddyExe run --config $caddyfile

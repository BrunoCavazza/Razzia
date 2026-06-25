@echo off
title Razzia - Iniciar
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "deploy\iniciar.ps1"
echo.
pause

@echo off
title Razzia - Detener
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "deploy\detener.ps1"
echo.
pause

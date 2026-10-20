@echo off
rem Launcher: all logic lives in docker-start.ps1 (PowerShell handles Thai text reliably).
rem Keep this file ASCII-only and always pause, so the window never closes before you can read errors.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0docker-start.ps1"
echo.
pause

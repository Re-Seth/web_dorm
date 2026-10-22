@echo off
rem Share the running site (http://localhost:8080) to the internet with a Cloudflare Quick Tunnel.
rem All logic lives in share-tunnel.ps1. Keep this file ASCII-only and always pause.
cd /d "%~dp0"
if not exist "%~dp0share-tunnel.ps1" (
  echo [X] share-tunnel.ps1 not found next to this file.
  echo     Please extract the whole ZIP first ^(right-click - Extract All^).
  pause
  exit /b 1
)
set TAOTHONG_LAUNCHER=1
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0share-tunnel.ps1"
echo.
pause

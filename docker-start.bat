@echo off
rem Launcher: all logic lives in docker-start.ps1 (PowerShell handles Thai text reliably).
rem Keep this file ASCII-only and always pause, so the window never closes before you can read errors.
cd /d "%~dp0"
if not exist "%~dp0docker-start.ps1" (
  echo [X] docker-start.ps1 not found next to this file.
  echo     Please extract the whole ZIP first ^(right-click - Extract All^), then run docker-start.bat from the extracted folder.
  pause
  exit /b 1
)
set TAOTHONG_LAUNCHER=1
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0docker-start.ps1"
echo.
pause

@echo off
rem Stop the Docker version of Web Dorm (data stays in the Docker volume). ASCII-only on purpose.
cd /d "%~dp0"
echo ========================================================
echo  Stopping Web Dorm (Docker)...
echo ========================================================
docker compose down
echo.
if errorlevel 1 (echo [X] Could not stop. Is Docker Desktop running?) else (echo [OK] All containers stopped. Your data is kept.)
pause

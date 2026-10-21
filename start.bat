@echo off
rem Run Web Dorm on this machine with Node.js (dev mode, port 5173); falls back to Docker if Node.js is missing.
rem ASCII-only on purpose (Thai text in .bat files can crash cmd on some Windows versions).
cd /d "%~dp0"
title Web Dorm (Tao Thong)
where node >nul 2>nul
if errorlevel 1 goto docker
node "%~dp0start.js"
goto end
:docker
echo [!] Node.js was not found on this computer. Starting with Docker instead...
echo.
call "%~dp0docker-start.bat"
:end

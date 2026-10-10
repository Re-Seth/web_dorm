@echo off
chcp 65001 >nul
title หอพักเทาทอง (Web Dorm)

where node >nul 2>nul
if %errorlevel% equ 0 (
    node "%~dp0start.js"
) else (
    echo [แจ้งเตือน] ไม่พบ Node.js บนเครื่องโฮสต์ (Windows)
    echo ระบบจะเริ่มต้นการทำงานผ่าน Docker แทนอัตโนมัติ...
    echo.
    call "%~dp0docker-start.bat"
)

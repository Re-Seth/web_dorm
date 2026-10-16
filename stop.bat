@echo off
chcp 65001 >nul
echo กำลังหยุดการทำงานของเซิร์ฟเวอร์ (Port 5000 และ 5173)...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo เรียบร้อย! ปิดเซิร์ฟเวอร์ทั้งหมดแล้ว.
timeout /t 2 >nul

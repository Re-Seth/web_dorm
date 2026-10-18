@echo off
chcp 65001 >nul
echo ========================================================
echo  🚀 กำลังเริ่มต้นระบบ หอพักเทาทอง (Web Dorm) ด้วย Docker...
echo ========================================================
echo.

rem สร้าง .env พร้อม JWT_SECRET แบบสุ่มในครั้งแรก (docker-compose.yml บังคับให้ต้องมี)
if not exist .env (
    powershell -NoProfile -Command "$b = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); 'JWT_SECRET=' + [Convert]::ToBase64String($b) | Out-File -Encoding ascii .env"
    echo สร้างไฟล์ .env พร้อม JWT_SECRET แบบสุ่มแล้ว
)

docker compose up -d --build
if %errorlevel% neq 0 (
    echo.
    echo ❌ ไม่สามารถเริ่มระบบด้วย Docker ได้
    echo กรุณาตรวจสอบว่า Docker Desktop เปิดใช้งานอยู่หรือไม่
    pause
    exit /b %errorlevel%
)

echo.
echo ✨ คอนเทนเนอร์กำลังทำงานเรียบร้อยแล้ว!
echo  👉 Frontend: http://localhost:8080
echo  👉 Backend:  http://localhost:5000
echo.
echo กำลังเปิดเบราว์เซอร์อัตโนมัติ...
start http://localhost:8080
echo.
echo ========================================================
echo หากต้องการหยุดการทำงาน สามารถรัน: docker compose down
echo หรือดับเบิลคลิกที่ docker-stop.bat
echo ========================================================
pause

@echo off
chcp 65001 >nul
echo ========================================================
echo  🚀 กำลังเริ่มต้นระบบ หอพักเทาทอง (Web Dorm) ด้วย Docker...
echo ========================================================
echo.

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
echo  👉 Frontend: http://localhost:5173
echo  👉 Backend:  http://localhost:5000
echo.
echo กำลังเปิดเบราว์เซอร์อัตโนมัติ...
start http://localhost:5173
echo.
echo ========================================================
echo หากต้องการหยุดการทำงาน สามารถรัน: docker compose down
echo หรือดับเบิลคลิกที่ docker-stop.bat
echo ========================================================
pause

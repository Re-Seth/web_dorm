@echo off
chcp 65001 >nul
rem ทำงานในโฟลเดอร์ของไฟล์นี้เสมอ (ไม่ว่าจะเรียกจากที่ไหน)
cd /d "%~dp0"
rem หมายเหตุ: ไฟล์นี้ต้องเป็น CRLF (บังคับไว้ใน .gitattributes) — ถ้าเป็น LF cmd จะอ่านเพี้ยน
echo ========================================================
echo  🚀 กำลังเริ่มต้นระบบ หอพักเทาทอง (Web Dorm) ด้วย Docker...
echo ========================================================
echo.

docker info >nul 2>nul
if errorlevel 1 goto nodocker

rem สร้าง .env พร้อม JWT_SECRET แบบสุ่มในครั้งแรก (docker-compose.yml บังคับให้ต้องมี)
if exist .env goto envready
powershell -NoProfile -Command "$b = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); 'JWT_SECRET=' + [Convert]::ToBase64String($b) | Out-File -Encoding ascii .env"
if not exist .env goto envfail
echo สร้างไฟล์ .env พร้อม JWT_SECRET แบบสุ่มแล้ว
:envready

docker compose up -d --build
if errorlevel 1 goto composefail

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
exit /b 0

:nodocker
echo ❌ เชื่อมต่อ Docker ไม่ได้
echo กรุณาติดตั้งและเปิด Docker Desktop ให้ขึ้นสถานะ Running ก่อน แล้วดับเบิลคลิกไฟล์นี้ใหม่
pause
exit /b 1

:envfail
echo ❌ สร้างไฟล์ .env ไม่สำเร็จ
echo กรุณาสร้างไฟล์ .env ในโฟลเดอร์นี้เอง โดยใส่บรรทัด JWT_SECRET=ข้อความสุ่มยาวอย่างน้อย 16 ตัวอักษร
pause
exit /b 1

:composefail
echo.
echo ❌ ไม่สามารถเริ่มระบบด้วย Docker ได้ (ดูข้อความ error ด้านบน)
echo สาเหตุที่พบบ่อย: พอร์ต 5000 หรือ 8080 ถูกโปรแกรมอื่นใช้อยู่
pause
exit /b 1

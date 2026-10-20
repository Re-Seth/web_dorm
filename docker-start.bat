@echo off
chcp 65001 >nul
rem ทำงานในโฟลเดอร์ของไฟล์นี้เสมอ (ไม่ว่าจะเรียกจากที่ไหน)
cd /d "%~dp0"
rem หมายเหตุ: ไฟล์นี้ต้องเป็น CRLF (บังคับไว้ใน .gitattributes) — ถ้าเป็น LF cmd จะอ่านเพี้ยน
echo ========================================================
echo  🚀 กำลังเริ่มต้นระบบ หอพักเทาทอง (Web Dorm) ด้วย Docker...
echo ========================================================
echo.

where docker >nul 2>nul
if errorlevel 1 goto nodockercli

docker info >nul 2>nul
if not errorlevel 1 goto dockerready

rem Docker Engine ยังไม่พร้อม: เปิด Docker Desktop ให้ (ถ้ายังไม่เปิด) แล้วรอสูงสุด ~2 นาที
echo ⏳ Docker Engine ยังไม่พร้อม กำลังเปิด Docker Desktop และรอสักครู่ (สูงสุด 2 นาที)...
if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
set /a tries=0
:waitdocker
ping -n 6 127.0.0.1 >nul
docker info >nul 2>nul
if not errorlevel 1 goto dockerready
set /a tries+=1
if %tries% lss 24 goto waitdocker
goto nodocker

:dockerready
echo ✅ เชื่อมต่อ Docker แล้ว

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

:nodockercli
echo ❌ ไม่พบคำสั่ง docker ในเครื่องนี้
echo กรุณาติดตั้ง Docker Desktop: https://www.docker.com/products/docker-desktop/
echo ติดตั้งเสร็จให้รีสตาร์ทเครื่อง เปิด Docker Desktop แล้วดับเบิลคลิกไฟล์นี้ใหม่
pause
exit /b 1

:nodocker
echo.
echo ❌ เชื่อมต่อ Docker Engine ไม่ได้ — ข้อความจาก Docker:
echo --------------------------------------------------------
docker info 2>&1 | findstr /i "error cannot denied pipe daemon"
echo --------------------------------------------------------
echo วิธีแก้ที่พบบ่อย:
echo  1. เปิด Docker Desktop แล้วรอจนมุมล่างซ้ายขึ้น "Engine running" จากนั้นดับเบิลคลิกไฟล์นี้ใหม่
echo  2. ถ้า Docker Desktop เปิดไม่ขึ้นหรือแจ้งเรื่อง WSL: เปิด PowerShell แบบ Run as administrator
echo     รันคำสั่ง  wsl --install  แล้วรีสตาร์ทเครื่อง
echo  3. ถ้าข้อความมีคำว่า "Access is denied" / "permission denied":
echo     ออกจากระบบ Windows แล้วเข้าใหม่ หรือเพิ่มบัญชีเข้ากลุ่ม docker-users
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

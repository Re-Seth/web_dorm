# เริ่มระบบหอพักเทาทองด้วย Docker — เรียกผ่าน docker-start.bat (ดับเบิลคลิก)
# ไฟล์นี้ต้องบันทึกเป็น UTF-8 with BOM เพื่อให้ Windows PowerShell 5.1 อ่านภาษาไทยถูก
[Console]::OutputEncoding = [Text.Encoding]::UTF8
Set-Location -LiteralPath $PSScriptRoot

function Write-Line($text, $color = 'Gray') { Write-Host $text -ForegroundColor $color }
function Test-DockerEngine {
    docker info *> $null
    return $LASTEXITCODE -eq 0
}

Write-Line '========================================================' DarkYellow
Write-Line ' กำลังเริ่มต้นระบบ หอพักเทาทอง (Web Dorm) ด้วย Docker...' Green
Write-Line '========================================================' DarkYellow
Write-Host ''

# 1) ต้องมี Docker
# เพิ่มโฟลเดอร์ bin ของ Docker Desktop เข้า PATH (เพิ่งติดตั้งแล้วยังไม่รีสตาร์ท PATH จะยังไม่มี
# ทำให้หา docker หรือ docker-credential-desktop ไม่เจอ: "error getting credentials")
$dockerBin = Join-Path $env:ProgramFiles 'Docker\Docker\resources\bin'
if ((Test-Path -LiteralPath $dockerBin) -and (($env:Path -split ';') -notcontains $dockerBin)) {
    $env:Path = "$dockerBin;$env:Path"
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Line '[X] ไม่พบคำสั่ง docker ในเครื่องนี้' Red
    Write-Line '    กรุณาติดตั้ง Docker Desktop: https://www.docker.com/products/docker-desktop/'
    Write-Line '    ติดตั้งเสร็จให้รีสตาร์ทเครื่อง เปิด Docker Desktop แล้วดับเบิลคลิก docker-start.bat ใหม่'
    exit 1
}

# 2) รอ Docker Engine พร้อม (เปิด Docker Desktop ให้ถ้ายังไม่เปิด, รอสูงสุด 2 นาที)
if (-not (Test-DockerEngine)) {
    Write-Line 'Docker Engine ยังไม่พร้อม กำลังเปิด Docker Desktop และรอสักครู่ (สูงสุด 2 นาที)...' Yellow
    $desktop = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
    if (Test-Path -LiteralPath $desktop) { Start-Process -FilePath $desktop }
    $ready = $false
    for ($i = 1; $i -le 24 -and -not $ready; $i++) {
        Start-Sleep -Seconds 5
        Write-Host '.' -NoNewline
        $ready = Test-DockerEngine
    }
    Write-Host ''
    if (-not $ready) {
        Write-Line '[X] เชื่อมต่อ Docker Engine ไม่ได้ — ข้อความจาก Docker:' Red
        Write-Line '--------------------------------------------------------'
        docker info 2>&1 | Select-String -Pattern 'error|cannot|denied|pipe|daemon' | ForEach-Object { Write-Line $_.Line Red }
        Write-Line '--------------------------------------------------------'
        Write-Line 'วิธีแก้ที่พบบ่อย:'
        Write-Line ' 1. เปิด Docker Desktop แล้วรอจนมุมล่างซ้ายขึ้น "Engine running" จากนั้นดับเบิลคลิก docker-start.bat ใหม่'
        Write-Line ' 2. ถ้า Docker Desktop เปิดไม่ขึ้นหรือแจ้งเรื่อง WSL: เปิด PowerShell แบบ Run as administrator'
        Write-Line '    รันคำสั่ง  wsl --install  แล้วรีสตาร์ทเครื่อง'
        Write-Line ' 3. ถ้าข้อความมีคำว่า "Access is denied" / "permission denied":'
        Write-Line '    ออกจากระบบ Windows แล้วเข้าใหม่ หรือเพิ่มบัญชีเข้ากลุ่ม docker-users'
        exit 1
    }
}
Write-Line '[OK] เชื่อมต่อ Docker แล้ว' Green

# 3) สร้าง .env พร้อม JWT_SECRET แบบสุ่มในครั้งแรก (docker-compose.yml บังคับให้ต้องมี)
if (-not (Test-Path -LiteralPath '.env')) {
    $bytes = New-Object byte[] 48
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    [IO.File]::WriteAllText((Join-Path $PSScriptRoot '.env'), "JWT_SECRET=$([Convert]::ToBase64String($bytes))`r`n")
    Write-Line 'สร้างไฟล์ .env พร้อม JWT_SECRET แบบสุ่มแล้ว'
}

# 4) Build และเริ่มระบบ
docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Host ''
    Write-Line '[X] ไม่สามารถเริ่มระบบด้วย Docker ได้ (ดูข้อความ error ด้านบน)' Red
    Write-Line 'สาเหตุที่พบบ่อย:'
    Write-Line ' - "port is already allocated": พอร์ต 5000 หรือ 8080 ถูกโปรแกรมอื่นใช้อยู่ ให้ปิดโปรแกรมนั้นก่อน'
    Write-Line ' - "error getting credentials" / "docker-credential-desktop ... not found": รีสตาร์ทเครื่องแล้วลองใหม่'
    Write-Line '   ถ้ายังไม่หาย เปิดไฟล์ %USERPROFILE%\.docker\config.json แล้วลบบรรทัด "credsStore": "desktop"'
    Write-Line ' - "container name ... is already in use": รันคำสั่ง  docker rm -f dorm_backend dorm_frontend  แล้วลองใหม่'
    exit 1
}

Write-Host ''
Write-Line 'คอนเทนเนอร์กำลังทำงานเรียบร้อยแล้ว!' Green
Write-Line ' Frontend: http://localhost:8080'
Write-Line ' Backend:  http://localhost:5000'
Write-Host ''
Write-Line 'กำลังเปิดเบราว์เซอร์อัตโนมัติ...'
Start-Process 'http://localhost:8080'
Write-Host ''
Write-Line '========================================================' DarkYellow
Write-Line 'หากต้องการหยุดการทำงาน ดับเบิลคลิก docker-stop.bat หรือรัน: docker compose down'
Write-Line '========================================================' DarkYellow

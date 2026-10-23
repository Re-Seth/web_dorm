# เริ่มระบบหอพักเทาทองด้วย Docker — เรียกผ่าน docker-start.bat (ดับเบิลคลิก)
# ไฟล์นี้ต้องบันทึกเป็น UTF-8 with BOM เพื่อให้ Windows PowerShell 5.1 อ่านภาษาไทยถูก
[Console]::OutputEncoding = [Text.Encoding]::UTF8
Set-Location -LiteralPath $PSScriptRoot

$Project = 'web_dorm'   # ต้องตรงกับ name: ใน docker-compose.yml
$Ports = 5000, 8080

function Write-Line($text, $color = 'Gray') { Write-Host $text -ForegroundColor $color }
function Test-DockerEngine {
    docker info *> $null
    return $LASTEXITCODE -eq 0
}
# ชื่อ + โปรเจกต์ compose ของ container (อ่านจาก JSON — PowerShell 5.1 ตัด " ในอาร์กิวเมนต์ --format ทิ้ง)
function Get-ContainerInfo($ref) {
    $json = docker inspect $ref 2>$null
    if ($LASTEXITCODE -ne 0) { return $null }
    $obj = @(($json | Out-String) | ConvertFrom-Json)[0]
    return [pscustomobject]@{ Name = $obj.Name.TrimStart('/'); Project = $obj.Config.Labels.'com.docker.compose.project' }
}

function Confirm-Yes($question) {
    $answer = Read-Host "$question (y/N)"
    return $answer -match '^(y|yes|ใช่)$'
}

# ---------- Docker CLI / PATH ----------
# เพิ่มโฟลเดอร์ bin ของ Docker Desktop เข้า PATH (เพิ่งติดตั้งแล้วยังไม่รีสตาร์ท PATH จะยังไม่มี
# ทำให้หา docker หรือ docker-credential-desktop ไม่เจอ: "error getting credentials")
function Add-DockerToPath {
    $candidates = @(
        (Join-Path $env:ProgramFiles 'Docker\Docker\resources\bin'),
        (Join-Path $env:LOCALAPPDATA 'Programs\Docker\Docker\resources\bin')
    )
    $cli = Get-Command docker -ErrorAction SilentlyContinue
    if ($cli) { $candidates += Split-Path -Parent $cli.Source }
    foreach ($dir in $candidates) {
        if ($dir -and (Test-Path -LiteralPath $dir) -and (($env:Path -split ';') -notcontains $dir)) {
            $env:Path = "$dir;$env:Path"
        }
    }
}

function Start-DockerDesktop {
    foreach ($exe in @(
        (Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'),
        (Join-Path $env:LOCALAPPDATA 'Programs\Docker\Docker\Docker Desktop.exe')
    )) {
        if (Test-Path -LiteralPath $exe) { Start-Process -FilePath $exe; return }
    }
}

# ---------- credential helper ที่หาไม่เจอ ----------
# config.json สั่งให้ใช้ credential helper (เช่น docker-credential-desktop) ที่ไม่มีในเครื่อง → ดึง image ไม่ได้
# จึงคัดลอก config เดิมไปไว้ที่ชั่วคราว แล้วตัดเฉพาะ helper ที่หาไม่เจอออก (proxy / auths อื่นยังอยู่ครบ)
# ใช้เฉพาะตอนรันสคริปต์นี้ ไม่แก้ไฟล์ config จริงของผู้ใช้
function Use-CleanDockerConfigIfNeeded {
    $cfgDir = if ($env:DOCKER_CONFIG) { $env:DOCKER_CONFIG } else { Join-Path $HOME '.docker' }
    $cfgFile = Join-Path $cfgDir 'config.json'
    if (-not (Test-Path -LiteralPath $cfgFile)) { return }
    try { $cfg = Get-Content -LiteralPath $cfgFile -Raw | ConvertFrom-Json } catch { return }
    if (-not $cfg) { return }

    $missing = @()
    if ($cfg.credsStore -and -not (Get-Command "docker-credential-$($cfg.credsStore)" -ErrorAction SilentlyContinue)) {
        $missing += $cfg.credsStore
        $cfg.PSObject.Properties.Remove('credsStore')
    }
    if ($cfg.credHelpers) {
        foreach ($p in @($cfg.credHelpers.PSObject.Properties)) {
            if (-not (Get-Command "docker-credential-$($p.Value)" -ErrorAction SilentlyContinue)) {
                $missing += $p.Value
                $cfg.credHelpers.PSObject.Properties.Remove($p.Name)
            }
        }
    }
    if ($missing.Count -eq 0) { return }

    # config ใหม่ไม่มีโฟลเดอร์ contexts เดิม → จำ endpoint ของ context ปัจจุบันไว้ (ถ้าผู้ใช้ไม่ได้ตั้ง DOCKER_HOST เอง)
    $endpoint = if ($env:DOCKER_HOST) { $null } else { "$(docker context inspect --format '{{.Endpoints.docker.Host}}' 2>$null)".Trim() }
    $cfg.PSObject.Properties.Remove('currentContext')
    $tmp = Join-Path $env:TEMP 'taothong-docker-config'
    New-Item -ItemType Directory -Path $tmp -Force | Out-Null
    [IO.File]::WriteAllText((Join-Path $tmp 'config.json'), ($cfg | ConvertTo-Json -Depth 20))
    $env:DOCKER_CONFIG = $tmp
    if ($endpoint) { $env:DOCKER_HOST = $endpoint }
    Write-Line "หาโปรแกรม docker-credential-$(($missing | Select-Object -Unique) -join ', ') ไม่เจอ — ใช้การตั้งค่า Docker ชั่วคราวแทน (ไม่แก้ไฟล์เดิม)" Yellow
    if (-not (Test-DockerEngine)) {
        Remove-Item Env:DOCKER_CONFIG -ErrorAction SilentlyContinue
        if ($endpoint) { Remove-Item Env:DOCKER_HOST -ErrorAction SilentlyContinue }
        Write-Line '  (ใช้การตั้งค่าชั่วคราวไม่ได้ กลับไปใช้ค่าเดิม)' Yellow
    }
}

# ---------- ของเก่าที่ชนกับระบบนี้ ----------
function Stop-OldInstances {
    # container ของแอปนี้ที่เปิดจากโฟลเดอร์อื่น/เวอร์ชันก่อน (ชื่อ container ซ้ำกัน) → ปิดให้เลย ข้อมูลยังอยู่ใน volume ของชุดนั้น
    foreach ($name in 'dorm_backend', 'dorm_frontend') {
        $info = Get-ContainerInfo $name
        if ($info -and $info.Project -ne $Project) {
            Write-Line "ปิด $name ของชุดเก่า (โปรเจกต์ '$($info.Project)') — ข้อมูลของชุดนั้นยังอยู่ใน volume" Yellow
            docker rm -f $name *> $null
        }
    }

    # container ของโปรเจกต์อื่นที่ใช้พอร์ตเดียวกัน → ถามก่อน
    foreach ($port in $Ports) {
        foreach ($id in @(docker ps -q --filter "publish=$port" 2>$null)) {
            $info = Get-ContainerInfo $id
            if (-not $info -or $info.Project -eq $Project) { continue }
            if (Confirm-Yes "container '$($info.Name)' ของโปรเจกต์อื่นใช้พอร์ต $port อยู่ หยุดชั่วคราวเพื่อเปิดระบบนี้ไหม") {
                docker stop $id *> $null
            } else {
                Write-Line '[X] พอร์ตถูกใช้อยู่ เปิดระบบไม่ได้' Red
                return $false
            }
        }
    }

    # โปรแกรมบนเครื่องที่จองพอร์ตอยู่ (ไม่นับตัว Docker เอง) → แจ้งให้ปิด หรือถามก่อนปิดถ้าเป็น node
    foreach ($port in $Ports) {
        $conns = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
        foreach ($procId in ($conns.OwningProcess | Sort-Object -Unique)) {
            $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
            if (-not $proc -or $proc.ProcessName -match '^(com\.docker\..*|wslrelay|vpnkit.*|Docker.*)$') { continue }
            if ($proc.ProcessName -eq 'node' -and (Confirm-Yes "โปรแกรม node (PID $procId) ใช้พอร์ต $port อยู่ (อาจเป็น start.js ที่ค้างไว้) ปิดไหม")) {
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                continue
            }
            Write-Line "[X] พอร์ต $port ถูกใช้โดยโปรแกรม $($proc.ProcessName) (PID $procId) — กรุณาปิดโปรแกรมนั้นก่อน" Red
            return $false
        }
    }
    return $true
}

# ---------- .env ----------
# docker-compose.yml บังคับให้มี JWT_SECRET → สร้าง/เติมให้อัตโนมัติด้วยค่าสุ่ม
function Ensure-EnvFile {
    $envFile = Join-Path $PSScriptRoot '.env'
    $existing = if (Test-Path -LiteralPath $envFile) { [IO.File]::ReadAllText($envFile) } else { '' }
    if ($existing -match '(?m)^\s*JWT_SECRET\s*=\s*\S{16,}') { return }
    $bytes = New-Object byte[] 48
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $line = "JWT_SECRET=$([Convert]::ToBase64String($bytes))"
    $kept = ($existing -split "`r?`n" | Where-Object { $_ -notmatch '^\s*JWT_SECRET\s*=' -and $_ -ne '' }) -join "`r`n"
    $content = (@($line, $kept) | Where-Object { $_ }) -join "`r`n"
    [IO.File]::WriteAllText($envFile, "$content`r`n")
    Write-Line 'ตั้งค่า JWT_SECRET แบบสุ่มในไฟล์ .env แล้ว'
}

# ---------- สำรองฐานข้อมูลก่อนอัปเดต ----------
# backend ที่รันอยู่ (ของโปรเจกต์นี้) → สำรอง DB ออกมาไว้ที่ backups\ เก็บล่าสุด 5 ชุด (ไฟล์ .db ไม่ขึ้น git)
function Backup-Database {
    $info = Get-ContainerInfo dorm_backend
    if (-not $info -or $info.Project -ne $Project) { return }
    docker exec dorm_backend node prisma/backup.js /data/backup-latest.db *> $null
    if ($LASTEXITCODE -ne 0) { return } # container เวอร์ชันเก่ายังไม่มีสคริปต์สำรอง
    $dir = Join-Path $PSScriptRoot 'backups'
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
    $file = Join-Path $dir ("dorm-{0}.db" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
    docker cp dorm_backend:/data/backup-latest.db $file *> $null
    if ($LASTEXITCODE -eq 0) {
        Write-Line "สำรองฐานข้อมูลไว้ที่ backups\$(Split-Path -Leaf $file)"
        Get-ChildItem -LiteralPath $dir -Filter 'dorm-*.db' | Sort-Object Name -Descending | Select-Object -Skip 5 | Remove-Item -Force
    }
}

function Get-LanAddress {
    # adapter ที่มี default gateway = เครือข่ายจริง (ไม่ใช่ adapter เสมือนของ WSL/Hyper-V)
    Get-NetIPConfiguration -ErrorAction SilentlyContinue |
        Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } |
        ForEach-Object { $_.IPv4Address.IPAddress } |
        Where-Object { $_ -notmatch '^(127\.|169\.254\.)' } |
        Select-Object -First 1
}

function Main {
    Write-Line '========================================================' DarkYellow
    Write-Line ' กำลังเริ่มต้นระบบ หอพักเทาทอง (Web Dorm) ด้วย Docker...' Green
    Write-Line '========================================================' DarkYellow
    Write-Host ''

    # 1) ต้องมี Docker
    Add-DockerToPath
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Line '[X] ไม่พบคำสั่ง docker ในเครื่องนี้' Red
        Write-Line '    กรุณาติดตั้ง Docker Desktop: https://www.docker.com/products/docker-desktop/'
        Write-Line '    ติดตั้งเสร็จให้รีสตาร์ทเครื่อง เปิด Docker Desktop แล้วดับเบิลคลิก docker-start.bat ใหม่'
        return 1
    }

    # 2) รอ Docker Engine พร้อม (เปิด Docker Desktop ให้ถ้ายังไม่เปิด, รอสูงสุด 3 นาที — ครั้งแรกอาจต้องกดยอมรับเงื่อนไขก่อน)
    if (-not (Test-DockerEngine)) {
        Write-Line 'Docker Engine ยังไม่พร้อม กำลังเปิด Docker Desktop และรอสักครู่ (สูงสุด 3 นาที)...' Yellow
        Write-Line '(ถ้าเพิ่งติดตั้ง Docker Desktop ให้กดยอมรับเงื่อนไขในหน้าต่าง Docker Desktop ด้วย)' Yellow
        Start-DockerDesktop
        $ready = $false
        for ($i = 1; $i -le 36 -and -not $ready; $i++) {
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
            return 1
        }
    }
    Write-Line '[OK] เชื่อมต่อ Docker แล้ว' Green

    # 3) ระบบนี้ใช้ Linux container
    $osType = "$(docker version --format '{{.Server.Os}}' 2>$null)".Trim()
    if ($osType -and $osType -ne 'linux') {
        Write-Line '[X] Docker Desktop อยู่ในโหมด Windows containers' Red
        Write-Line '    คลิกขวาที่ไอคอนวาฬ (มุมขวาล่าง) → "Switch to Linux containers..." แล้วดับเบิลคลิก docker-start.bat ใหม่'
        return 1
    }

    Use-CleanDockerConfigIfNeeded
    if (-not (Stop-OldInstances)) { return 1 }
    Ensure-EnvFile
    Backup-Database

    # 4) Build และเริ่มระบบ (--wait = รอจน backend พร้อมใช้งานจริงก่อน)
    Write-Line 'กำลัง build และเริ่มระบบ (ครั้งแรกใช้เวลาหลายนาที)...'
    docker compose up -d --build --wait | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Write-Host ''
        Write-Line '[X] ไม่สามารถเริ่มระบบด้วย Docker ได้ (ดูข้อความ error ด้านบน)' Red
        Write-Line 'สาเหตุที่พบบ่อย:'
        Write-Line ' - "port is already allocated" / "access a socket in a way forbidden": พอร์ต 5000 หรือ 8080 ถูกใช้อยู่หรือถูก Windows จองไว้'
        Write-Line ' - "error getting credentials": รีสตาร์ทเครื่องแล้วลองใหม่'
        Write-Line ' - ดาวน์โหลดไม่ได้ (timeout / TLS): ตรวจอินเทอร์เน็ต หรือ proxy ขององค์กร'
        Write-Line ' - backend ไม่ผ่าน healthcheck: ดูรายละเอียดด้วยคำสั่ง  docker compose logs backend'
        return 1
    }

    Write-Host ''
    Write-Line 'คอนเทนเนอร์กำลังทำงานเรียบร้อยแล้ว!' Green
    Write-Line ' เปิดเว็บที่เครื่องนี้: http://localhost:8080'
    $lan = Get-LanAddress
    if ($lan) { Write-Line " เครื่องอื่นในวง LAN เดียวกัน: http://${lan}:8080 (ถ้าเปิดไม่ได้ ให้อนุญาตพอร์ต 8080 ใน Windows Firewall)" }
    Write-Host ''
    Write-Line 'กำลังเปิดเบราว์เซอร์อัตโนมัติ...'
    Start-Process 'http://localhost:8080'
    Write-Host ''
    Write-Line '========================================================' DarkYellow
    Write-Line 'หากต้องการหยุดการทำงาน ดับเบิลคลิก docker-stop.bat หรือรัน: docker compose down'
    Write-Line '========================================================' DarkYellow
    return 0
}

$code = Main | Select-Object -Last 1
# เปิดไฟล์นี้ตรง ๆ (คลิกขวา > Run with PowerShell) → หยุดรอก่อนปิดหน้าต่าง; ผ่าน docker-start.bat จะ pause ให้อยู่แล้ว
if (-not $env:TAOTHONG_LAUNCHER) { Read-Host 'กด Enter เพื่อปิดหน้าต่างนี้' | Out-Null }
exit $code

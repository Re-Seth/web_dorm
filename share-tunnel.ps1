# แชร์เว็บทดสอบ (http://localhost:8080) ให้คนอื่นเข้าผ่านอินเทอร์เน็ตด้วย Cloudflare Quick Tunnel
# เรียกผ่าน share-tunnel.bat (ดับเบิลคลิก) — ไฟล์นี้ต้องบันทึกเป็น UTF-8 with BOM
[Console]::OutputEncoding = [Text.Encoding]::UTF8
Set-Location -LiteralPath $PSScriptRoot

$LocalUrl = 'http://localhost:8080'

function Write-Line($text, $color = 'Gray') { Write-Host $text -ForegroundColor $color }
function Confirm-Yes($question) {
    $answer = Read-Host "$question (y/N)"
    return $answer -match '^(y|yes|ใช่)$'
}
function Test-Url($url, $timeout = 5) {
    try { Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec $timeout | Out-Null; return $true } catch { return $false }
}
function Find-Cloudflared {
    $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $candidates = @(
        (Join-Path ${env:ProgramFiles(x86)} 'cloudflared\cloudflared.exe'),
        (Join-Path $env:ProgramFiles 'cloudflared\cloudflared.exe'),
        (Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links\cloudflared.exe')
    )
    foreach ($p in $candidates) { if ($p -and (Test-Path -LiteralPath $p)) { return $p } }
    return $null
}

# ---------- 1) หา/ติดตั้ง cloudflared ----------
$cf = Find-Cloudflared
if (-not $cf) {
    Write-Line 'ยังไม่ได้ติดตั้ง cloudflared (โปรแกรมของ Cloudflare สำหรับเปิดลิงก์สาธารณะ)' Yellow
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        Write-Line 'ไม่พบ winget — ดาวน์โหลดเองได้ที่ https://github.com/cloudflare/cloudflared/releases แล้วรันไฟล์นี้อีกครั้ง' Red
        exit 1
    }
    if (-not (Confirm-Yes 'ติดตั้ง cloudflared ด้วย winget ตอนนี้เลยไหม')) { exit 1 }
    winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements
    $cf = Find-Cloudflared
    if (-not $cf) { Write-Line 'ติดตั้งไม่สำเร็จ ลองปิดหน้าต่างนี้แล้วเปิด share-tunnel.bat ใหม่' Red; exit 1 }
}

# ---------- 2) เว็บต้องรันอยู่ก่อน ----------
if (-not (Test-Url $LocalUrl)) {
    Write-Line "ยังเปิด $LocalUrl ไม่ได้ (ระบบยังไม่ได้เริ่ม)" Yellow
    if (-not (Confirm-Yes 'เริ่มระบบด้วย docker-start ก่อนไหม')) { exit 1 }
    & (Join-Path $PSScriptRoot 'docker-start.ps1')
    if (-not (Test-Url $LocalUrl 10)) { Write-Line "ยังเปิด $LocalUrl ไม่ได้ — แก้ปัญหาจากข้อความด้านบนก่อน" Red; exit 1 }
}

# ---------- 3) เปิด tunnel ----------
$log = Join-Path $env:TEMP "taothong-tunnel-$PID.log"
$errLog = "$log.err"
Write-Line 'กำลังเปิดลิงก์สาธารณะ (Cloudflare Quick Tunnel)...' Cyan
$proc = Start-Process -FilePath $cf -ArgumentList 'tunnel', '--no-autoupdate', '--url', $LocalUrl `
    -NoNewWindow -PassThru -RedirectStandardOutput $log -RedirectStandardError $errLog

try {
    $publicUrl = $null
    for ($i = 0; $i -lt 60 -and -not $proc.HasExited; $i++) {
        $m = Select-String -Path $errLog, $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($m) { $publicUrl = $m.Matches[0].Value; break }
        Start-Sleep -Seconds 1
    }
    if (-not $publicUrl) {
        Write-Line 'เปิด tunnel ไม่สำเร็จ — ข้อความจาก cloudflared:' Red
        Get-Content $errLog, $log -Tail 15 -ErrorAction SilentlyContinue | ForEach-Object { Write-Line "  $_" }
        Write-Line 'ตรวจว่าเครื่องต่ออินเทอร์เน็ตอยู่ แล้วลองใหม่อีกครั้ง' Yellow
        exit 1
    }

    # ลิงก์ใหม่ใช้เวลาสักครู่กว่า DNS จะพร้อม (เช็กเร็วไป Windows จะจำว่า "ไม่มีโดเมนนี้" ไว้ช่วงหนึ่ง)
    Write-Line 'ได้ลิงก์แล้ว กำลังรอให้ลิงก์ใช้งานได้...' Cyan
    Start-Sleep -Seconds 10
    $ready = $false
    for ($i = 0; $i -lt 20 -and -not $proc.HasExited; $i++) {
        if (Test-Url $publicUrl) { $ready = $true; break }
        Start-Sleep -Seconds 3
    }
    try { Set-Clipboard -Value $publicUrl } catch {}

    Write-Host ''
    Write-Line '============================================================' Green
    Write-Line '  ส่งลิงก์นี้ให้คนอื่นเข้าเว็บทดสอบได้เลย (คัดลอกไว้ใน clipboard แล้ว)' Green
    Write-Host ''
    Write-Line "  $publicUrl" White
    Write-Host ''
    Write-Line '============================================================' Green
    if (-not $ready) { Write-Line 'ลิงก์อาจยังเข้าไม่ได้ทันที รอประมาณ 1 นาทีแล้วลองใหม่' Yellow }
    Write-Line 'ห้ามปิดหน้าต่างนี้ระหว่างแชร์ — ปิดหน้าต่างหรือกด Ctrl+C เพื่อหยุดแชร์' Yellow
    Write-Line 'ทุกครั้งที่เปิดใหม่จะได้ลิงก์ใหม่ (ต้องส่งให้เพื่อนใหม่)' DarkGray

    Wait-Process -Id $proc.Id
    Write-Line 'tunnel หยุดทำงานแล้ว — ข้อความล่าสุด:' Yellow
    Get-Content $errLog -Tail 5 -ErrorAction SilentlyContinue | ForEach-Object { Write-Line "  $_" }
}
finally {
    if (-not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
    Remove-Item $log, $errLog -ErrorAction SilentlyContinue
}

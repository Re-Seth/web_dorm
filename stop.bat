@echo off
rem Stop the dev servers started by start.bat (only node.exe processes on ports 5000 and 5173). ASCII-only on purpose.
echo Stopping Web Dorm dev servers (ports 5000 and 5173)...
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -Command "Get-NetTCPConnection -LocalPort 5000,5173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue } | Where-Object { $_.ProcessName -eq 'node' } | ForEach-Object { Stop-Process -Id $_.Id -Force; Write-Host ('Stopped node PID ' + $_.Id) }"
echo Done.
timeout /t 2 >nul

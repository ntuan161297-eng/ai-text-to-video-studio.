@echo off
setlocal enabledelayedexpansion
title AI TEXT-TO-VIDEO STUDIO
color 0A

:: 1. Dam bao duong dan sach se (loai bo dau \ o cuoi de tranh loi thoat ngoac kep \")
set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"

cd /d "%APP_DIR%"

:: 2. Dam bao bien moi truong he thong
set "PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%APP_DIR%\runtime;%APP_DIR%\runtime\node_modules\npm\bin;%PATH%"

echo =====================================================================
echo                AI TEXT-TO-VIDEO STUDIO (STANDALONE)
echo =====================================================================
echo.

:: 3. Nhan dien Node.js
if exist "%APP_DIR%\runtime\node.exe" (
    set "NODE_BIN=%APP_DIR%\runtime\node.exe"
    echo [INFO] Su dung Node.js Portable Runtime co san.
) else (
    set "NODE_BIN=node"
    echo [INFO] Su dung Node.js he thong.
)

:: 4. Khoi tao .env mac dinh
if not exist "%APP_DIR%\.env" (
    if exist "%APP_DIR%\.env.example" (
        copy /Y "%APP_DIR%\.env.example" "%APP_DIR%\.env" >nul
        echo [INFO] Da tao file .env mac dinh.
    )
)

:: 5. Tao cac thu muc can thiet
if not exist "%APP_DIR%\output" mkdir "%APP_DIR%\output" >nul 2>&1
if not exist "%APP_DIR%\temp" mkdir "%APP_DIR%\temp" >nul 2>&1
if not exist "%APP_DIR%\data" mkdir "%APP_DIR%\data" >nul 2>&1
if not exist "%APP_DIR%\review" mkdir "%APP_DIR%\review" >nul 2>&1

:: 6. Giai phong cong 4000 va 3000 neu con sot tu phien truoc
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :4000') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :3000') do taskkill /f /pid %%a >nul 2>&1

:: 7. Khoi dong Backend Server (Cong 4000)
echo [1/3] Dang khoi dong Backend Server (Cong 4000)...
start "AI Video Backend Server" /min cmd /c "cd /d "%APP_DIR%" && "%NODE_BIN%" "%APP_DIR%\node_modules\tsx\dist\cli.mjs" "%APP_DIR%\src\server\index.ts""

:: Cho 3 giay cho Backend khoi tao
ping 127.0.0.1 -n 4 >nul

:: 8. Khoi dong Giao dien Web Studio (Cong 3000)
echo [2/3] Dang khoi dong Giao dien Web Studio (Cong 3000)...
if exist "%APP_DIR%\web\.next\BUILD_ID" (
    start "AI Video Web UI" /min cmd /c "cd /d "%APP_DIR%\web" && "%NODE_BIN%" "%APP_DIR%\web\node_modules\next\dist\bin\next" start -p 3000"
) else (
    start "AI Video Web UI" /min cmd /c "cd /d "%APP_DIR%\web" && "%NODE_BIN%" "%APP_DIR%\web\node_modules\next\dist\bin\next" dev -p 3000"
)

:: 9. Cho Web Server san sang 100% va tu dong bat trinh duyet
echo [3/3] Dang cho he thong san sang va tu dong bat trinh duyet...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ready = $false; " ^
    "for ($i=0; $i -lt 25; $i++) { " ^
    "    try { " ^
    "        $res = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 2; " ^
    "        if ($res.StatusCode -eq 200) { $ready = $true; break; } " ^
    "    } catch { } " ^
    "    Start-Sleep -Seconds 1; " ^
    "} " ^
    "$url = 'http://localhost:3000'; " ^
    "if (Test-Path 'C:\Program Files\Google\Chrome\Application\chrome.exe') { " ^
    "    Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' $url; " ^
    "} elseif (Test-Path 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe') { " ^
    "    Start-Process 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe' $url; " ^
    "} elseif (Test-Path 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe') { " ^
    "    Start-Process 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' $url; " ^
    "} elseif (Test-Path 'C:\Program Files\Microsoft\Edge\Application\msedge.exe') { " ^
    "    Start-Process 'C:\Program Files\Microsoft\Edge\Application\msedge.exe' $url; " ^
    "} else { " ^
    "    Start-Process $url; " ^
    "}"

echo.
echo =====================================================================
echo   [OK] HE THONG DA SAN SANG!
echo   Dia chi truy cap: http://localhost:3000
echo.
echo   Hai cua so Backend va Web dang chay ngam duoi Taskbar.
echo   De tat chuong trinh: Hay chay file "Tat_Studio.bat"
echo =====================================================================
echo.
timeout /t 5 >nul
exit

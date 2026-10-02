@echo off
title AI TEXT-TO-VIDEO STUDIO
color 0A

:: 1. Dam bao bien moi truong he thong luon co san
set "PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%~dp0runtime;%~dp0runtime\node_modules\npm\bin;%PATH%"

cd /d "%~dp0"

echo =====================================================================
echo                AI TEXT-TO-VIDEO STUDIO (STANDALONE)
echo =====================================================================
echo.

:: 2. Nhan dien Node.js
if exist "%~dp0runtime\node.exe" (
    set "NODE_BIN=%~dp0runtime\node.exe"
    echo [INFO] Su dung Node.js Portable Runtime co san.
) else (
    set "NODE_BIN=node"
    echo [INFO] Su dung Node.js he thong.
)

:: 3. Khoi tao .env mac dinh (khong bao gio lay key cua may cu)
if not exist "%~dp0.env" (
    if exist "%~dp0.env.example" (
        copy /Y "%~dp0.env.example" "%~dp0.env" >nul
        echo [INFO] Da tao file .env mac dinh.
    )
)

:: 4. Tao cac thu muc can thiet
if not exist "%~dp0output" mkdir "%~dp0output" >nul 2>&1
if not exist "%~dp0temp" mkdir "%~dp0temp" >nul 2>&1
if not exist "%~dp0data" mkdir "%~dp0data" >nul 2>&1
if not exist "%~dp0review" mkdir "%~dp0review" >nul 2>&1

:: 5. Giai phong cong cu neu con sot
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :4000') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :3000') do taskkill /f /pid %%a >nul 2>&1

:: 6. Kiem tra build giao dien Web
if not exist "%~dp0web\.next\BUILD_ID" (
    echo [INFO] Dang khoi tao ban dung Web UI lan dau...
    cd /d "%~dp0web"
    "%NODE_BIN%" "%~dp0web\node_modules\next\dist\bin\next" build
    cd /d "%~dp0"
)

echo [1/3] Dang khoi dong Backend Server (Cong 4000)...
start "AI Video Backend Server" cmd /k "cd /d "%~dp0" && "%NODE_BIN%" "%~dp0node_modules\tsx\dist\cli.mjs" "%~dp0src\server\index.ts""

ping 127.0.0.1 -n 4 >nul

echo [2/3] Dang khoi dong Giao dien Web Studio (Cong 3000)...
start "AI Video Web UI" cmd /k "cd /d "%~dp0web" && "%NODE_BIN%" "%~dp0web\node_modules\next\dist\bin\next" start -p 3000"

ping 127.0.0.1 -n 4 >nul

echo [3/3] Dang mo trinh duyet Web...
start http://localhost:3000

echo.
echo =====================================================================
echo   [OK] HE THONG DA SAN SANG!
echo   Dia chi truy cap: http://localhost:3000
echo.
echo   Luu y: Giu 2 cua so Backend va Web UI chay trong suot qua trinh dung.
echo   Khi muon tat chuong trinh: Chay file "Tat_Studio.bat"
echo =====================================================================
echo.
pause

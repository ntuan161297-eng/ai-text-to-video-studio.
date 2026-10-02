@echo off
chcp 65001 >nul
title Khởi Động AI Text-To-Video Studio
color 0B

echo =====================================================================
echo                AI TEXT-TO-VIDEO STUDIO (CHUYÊN NGHIỆP)
echo =====================================================================
echo.

:: 1. Tu dong nhan dien runtime neu co san trong thu muc
if exist "%~dp0runtime\node.exe" (
    set "PATH=%~dp0runtime;%~dp0runtime\node_modules\npm\bin;%PATH%"
)

:: 2. Khoi tao file .env neu chua co
if not exist "%~dp0.env" (
    if exist "%~dp0.env.example" (
        copy "%~dp0.env.example" "%~dp0.env" >nul
        echo [INFO] Da tu dong tao cau hinh .env ban dau.
    )
)

:: 3. Dam bao thu muc output ton tai
if not exist "%~dp0output" (
    mkdir "%~dp0output" >nul
)

echo [1/3] Dang khoi dong may chu Backend (Cong 4000)...
start "AI Video Backend Server" /min cmd /c "chcp 65001 >nul && cd /d "%~dp0" && npm run server"

timeout /t 3 /nobreak >nul

echo [2/3] Dang khoi dong Giao dien Web (Cong 3000)...
start "AI Video Web Studio" /min cmd /c "chcp 65001 >nul && cd /d "%~dp0web" && npm run start"

timeout /t 3 /nobreak >nul

echo [3/3] Dang tu dong mo trinh duyet Web...
start http://localhost:3000

echo.
echo =====================================================================
echo   ✅ AI TEXT-TO-VIDEO STUDIO DA SAN SANG!
echo   Trinh duyet dang mo tai: http://localhost:3000
echo.
echo   De tat Studio: Ban hay chay file "Tat_Studio.bat"
echo =====================================================================
echo.
timeout /t 5 >nul
exit

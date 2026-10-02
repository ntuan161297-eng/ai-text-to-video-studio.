@echo off
chcp 65001 >nul
title TẠO BỘ CÀI ĐẶT WINDOWS (.EXE) - AI TEXT-TO-VIDEO STUDIO
color 0A

echo =====================================================================
echo       CÔNG CỤ ĐÓNG GÓI BỘ CÀI ĐẶT WINDOWS CHUYÊN NGHIỆP (.EXE)
echo =====================================================================
echo.

:: 1. Kiem tra thu vien Inno Setup Compiler
if not exist "%~dp0installer\tools\innosetup_bin\ISCC.exe" (
    echo [1/4] Dang thiet lap trinh bien dich Inno Setup...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "$url = 'https://github.com/jrsoftware/issrc/releases/download/is-6_7_3/innosetup-6.7.3.exe'; " ^
        "$dest = '%~dp0installer\tools\setup.exe'; " ^
        "New-Item -ItemType Directory -Path '%~dp0installer\tools' -Force | Out-Null; " ^
        "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
        "Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing; " ^
        "Start-Process -FilePath $dest -ArgumentList '/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SP- /DIR=\"%~dp0installer\tools\innosetup_bin\"' -Wait; " ^
        "Remove-Item $dest -Force"
) else (
    echo [1/4] Trinh bien dich Inno Setup: DA SAN SANG.
)

:: 2. Kiem tra Runtime Node.js di dong
if not exist "%~dp0installer\runtime\node.exe" (
    echo [2/4] Dang chuan bi goi Node.js di dong (Runtime)...
    if exist "%LOCALAPPDATA%\Programs\nodejs" (
        xcopy /E /I /Y "%LOCALAPPDATA%\Programs\nodejs" "%~dp0installer\runtime" >nul
    ) else if exist "C:\Users\Admin\nodejs" (
        xcopy /E /I /Y "C:\Users\Admin\nodejs" "%~dp0installer\runtime" >nul
    ) else if exist "C:\Program Files\nodejs" (
        xcopy /E /I /Y "C:\Program Files\nodejs" "%~dp0installer\runtime" >nul
    )
) else (
    echo [2/4] Goi Runtime Node.js: DA SAN SANG.
)

:: 3. Kiem tra build giao dien Web
echo [3/4] Kiem tra ban build Giao dien Web...
if not exist "%~dp0web\.next" (
    echo Dang build Giao dien Web lan dau (co the mat 1 phut)...
    cd /d "%~dp0web" && npm run build && cd /d "%~dp0"
) else (
    echo Ban build Web da ton tai.
)

:: 4. Tien hanh dong goi file EXE
echo.
echo [4/4] Dang tien hanh dong goi file Setup .EXE (Nen sieu cao cap LZMA2)...
echo Xin vui long cho trong 1-2 phut...
echo.

"%~dp0installer\tools\innosetup_bin\ISCC.exe" "%~dp0installer\setup_script.iss"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =====================================================================
    echo   🎉 CHUC MUNG! DA TAO THANH CONG BO CAI DAT WINDOWS (.EXE)
    echo   File cai dat nam tai thu muc: installer\output\AI_Studio_Setup_v1.0.exe
    echo.
    echo   Ban chi can copy file nay (gui Google Drive / USB / Zalo)
    echo   cho bat ky ai muon su dung!
    echo =====================================================================
    explorer "%~dp0installer\output"
) else (
    echo.
    echo ❌ Co loi xay ra trong qua trinh dong goi! Vui long kiem tra lai.
)

echo.
pause

@echo off
chcp 65001 >nul
title KẾT NỐI VÀ ĐỒNG BỘ MÃ NGUỒN TỪ GITHUB
color 0A

set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"
cd /d "%APP_DIR%"

echo =====================================================================
echo          CẬP NHẬT TỰ ĐỘNG MÃ NGUỒN MỚI NHẤT TỪ GITHUB
echo =====================================================================
echo.

where git >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [!] Máy tính này chưa cài đặt Git.
    echo Vui lòng tải và cài đặt Git tại: https://git-scm.com/download/win
    echo (Chỉ cần tải bản 64-bit và bấm Next liên tục để hoàn tất)
    echo.
    pause
    exit /b 1
)

echo [*] Đang kiểm tra liên kết Git...
if not exist "%APP_DIR%\.git" (
    echo [*] Thư mục chưa có .git. Đang tự động kết nối tới kho mã nguồn GitHub...
    git init
    git remote add origin https://github.com/ntuan161297-eng/ai-text-to-video-studio..git
    git fetch origin main
    git reset --hard origin/main
) else (
    echo [*] Đang kéo mã nguồn mới nhất (git pull origin main)...
    git pull origin main
)

echo.
echo [*] Đang cập nhật bản build Giao diện Web (Production)...
cd /d "%APP_DIR%\web"
if exist "%APP_DIR%\runtime\node.exe" (
    call "%APP_DIR%\runtime\node.exe" "%APP_DIR%\web\node_modules\next\dist\bin\next" build
) else (
    call npm run build
)
cd /d "%APP_DIR%"

echo.
echo =====================================================================
echo   🎉 CHÚC MỪNG! ĐÃ CẬP NHẬT THÀNH CÔNG CODE MỚI NHẤT TỪ GITHUB!
echo   Bây giờ bạn chỉ cần chạy "Khoi_Dong_Studio.bat" để sử dụng!
echo =====================================================================
echo.
pause

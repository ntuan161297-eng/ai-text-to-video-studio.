@echo off
chcp 65001 >nul
title [3/3] CẬP NHẬT PHIÊN BẢN MỚI NHẤT
color 0E

echo =====================================================================
echo           ĐANG KIỂM TRA VÀ TẢI BẢN CẬP NHẬT TỪ MÁY CHỦ (GIT)
echo =====================================================================
echo.

where git >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [LOI] May tinh chua cai dat Git de lay code tu dong.
    echo Vui long tai Git tai: https://git-scm.com/
    pause
    exit /b 1
)

echo 📥 1. Dang keo ma nguon moi nhat tu Git (git pull)...
git pull origin main
if %errorlevel% neq 0 (
    echo.
    echo ⚠️ Khong the git pull truc tiep tu main, dang thu git pull mac dinh...
    git pull
)

echo.
echo 📦 2. Cap nhat cac thu vien Backend (npm install)...
call npm install

echo.
echo 🔨 3. Build lai giao dien Web Frontend...
cd web
call npm install
call npm run build
cd ..

color 0A
echo.
echo =====================================================================
echo        🎉 ĐÃ CẬP NHẬT THÀNH CÔNG LÊN PHIÊN BẢN MỚI NHẤT!
echo =====================================================================
echo.
echo Ban co the chay file "2_Khoi_Dong_Studio.bat" de su dung cac tinh nang moi!
echo.
pause

@echo off
chcp 65001 >nul
title [1/3] CÀI ĐẶT LẦN ĐẦU - AI TEXT TO VIDEO STUDIO
color 0B

echo =====================================================================
echo           CHƯƠNG TRÌNH TỰ ĐỘNG CÀI ĐẶT AI TEXT-TO-VIDEO STUDIO
echo =====================================================================
echo.

:: 1. Kiểm tra Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [LOI] May tinh cua ban CHUA CAI DAT Node.js!
    echo.
    echo Vui long tai va cai dat Node.js ban LTS tai:
    echo 👉 https://nodejs.org/ (Chon ban LTS khuyen nghi)
    echo Sau khi cai dat xong, hay mo lai file nay.
    echo.
    pause
    exit /b 1
)

echo [1/5] Kiem tra Node.js: OK!
node -v

:: 2. Thiết lập file .env nếu chưa có
echo.
echo [2/5] Khoi tao file cau hinh moi truong...
if not exist ".env" (
    copy ".env.example" ".env" >nul
    echo   -> Da tao file .env mac dinh tu .env.example
) else (
    echo   -> File .env da ton tai san.
)

:: 3. Tạo các thư mục làm việc cần thiết
echo.
echo [3/5] Khoi tao cac thu muc luu tru video va du lieu...
if not exist "output" mkdir output
if not exist "temp" mkdir temp
if not exist "data" mkdir data

:: 4. Cài đặt thư viện Backend
echo.
echo [4/5] Dang cai dat cac thu vien Backend (npm install)...
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo [LOI] Khong the cai dat thu vien Backend. Vui long kiem tra ket noi mang.
    pause
    exit /b 1
)

:: 5. Cài đặt và build giao diện Web Frontend
echo.
echo [5/5] Dang cai dat va build giao dien Web Frontend...
cd web
call npm install
call npm run build
cd ..

color 0A
echo.
echo =====================================================================
echo                🎉 CÀI ĐẶT HOÀN TẤT THÀNH CÔNG!
echo =====================================================================
echo.
echo Bay gio ban chi can nhap dup chuot vao file:
echo    👉 "2_Khoi_Dong_Studio.bat"
echo de mo ung dung va bat dau tao video ngay tren trinh duyet!
echo.
pause

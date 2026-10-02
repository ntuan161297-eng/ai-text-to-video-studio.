@echo off
chcp 65001 >nul
title [2/3] KHỞI ĐỘNG AI TEXT TO VIDEO STUDIO
color 0A

echo =====================================================================
echo                ĐANG KHỞI ĐỘNG AI TEXT-TO-VIDEO STUDIO
echo =====================================================================
echo.
echo 🚀 1. Dang chay Backend Server tai cong 4000...
start "AI Video Backend Server (Port 4000)" cmd /k "chcp 65001 >nul && npm run server"

timeout /t 3 /nobreak >nul

echo 🌐 2. Dang chay Giao dien Web tai cong 3000...
start "AI Video Web UI (Port 3000)" cmd /k "chcp 65001 >nul && cd web && npm run start"

timeout /t 3 /nobreak >nul

echo 💻 3. Dang tu dong mo trinh duyet Web tai http://localhost:3000 ...
start http://localhost:3000

echo.
echo =====================================================================
echo   ✅ HE THONG DA SAN SANG!
echo   Dia chi truy cap: http://localhost:3000
echo.
echo   Luu y: Giu 2 cua so CMD Backend va Web chay ngam trong khi su dung.
echo   Khi muon tat chuong trinh, chi can dong 2 cua so CMD do lai.
echo =====================================================================
echo.
pause

@echo off
chcp 65001 >nul
title Đang tắt AI Text-To-Video Studio
color 0C

echo =====================================================================
echo                ĐANG TẮT AI TEXT-TO-VIDEO STUDIO
echo =====================================================================
echo.

echo 🛑 Dang giai phong cong 4000 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4000') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo 🛑 Dang giai phong cong 3000 (Web UI)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo ✅ Da tat toan bo AI Studio hoan tat!
timeout /t 2 >nul
exit

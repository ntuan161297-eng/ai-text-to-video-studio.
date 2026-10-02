@echo off
@setlocal enableextensions enabledelayedexpansion
title DUNG AI TEXT-TO-VIDEO STUDIO
color 0C

set "PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%PATH%"

echo =====================================================================
echo                DANG TAT AI TEXT-TO-VIDEO STUDIO
echo =====================================================================
echo.

echo [*] Giai phong cong 4000 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :4000') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo [*] Giai phong cong 3000 (Web UI)...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :3000') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo [OK] Da tat toan bo he thong Studio!
ping 127.0.0.1 -n 3 >nul
exit

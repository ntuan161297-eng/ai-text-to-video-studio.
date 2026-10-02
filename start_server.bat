@echo off
title AI Text-to-Video Backend Server
echo ========================================================
echo   KHOI DONG BACKEND API SERVER & WORKER (PORT 4000)
echo ========================================================

set "PATH=C:\Users\Admin\bin;C:\Users\Admin\nodejs;%PATH%"
cd /d "C:\Users\Admin\.gemini\antigravity-ide\scratch\ai-text-to-video"

node "node_modules/tsx/dist/cli.mjs" "src/server/index.ts"
pause

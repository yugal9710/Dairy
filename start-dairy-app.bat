@echo off
title Dairy ERP 2.0 - Milk Management System
color 0A
cd /d "%~dp0"

echo ========================================================
echo        DAIRY ERP 2.0 - COOPERATIVE MANAGEMENT SYSTEM
echo     FAT/SNF Pricing + POS + Production + Nepali BS
echo ========================================================
echo.
echo Checking Node.js installation...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found on your system!
    echo Please install Node.js from https://nodejs.org/ to run this software.
    pause
    exit /b 1
)

echo Starting Dairy ERP 2.0 System...
echo Web App will open at: http://localhost:3000
echo.
node run.js
pause

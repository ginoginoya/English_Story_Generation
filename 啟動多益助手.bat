@echo off
title TOEIC Helper Launcher
pushd "%~dp0"

:: 0. Check Port 7000
netstat -ano | findstr :7000 | findstr LISTENING > nul
if %errorlevel% equ 0 (
    echo [Warning] Server is ALREADY running on port 7000.
    echo [Action] Please close the existing window first.
    echo.
    pause
    exit
)

:: 1. Virtual Environment Check
echo [Step 1/4] Checking Virtual Environment...
if not exist venv (
    echo [Note] venv not found. Initializing...
    python -m venv venv
) else (
    echo [OK] venv exists.
)

:: 2. Activate & Install Dependencies
echo [Step 2/4] Activating Environment ^& Installing Python Deps...
call venv\Scripts\activate
pip install -q -r requirements.txt
echo.

:: 3. Node.js Dependencies
echo [Step 3/4] Checking Node.js Dependencies...
if not exist "node_modules\" (
    echo [Note] node_modules not found. Installing...
    call npm install --silent
) else (
    echo [OK] node_modules exists.
)
echo.

:: 4. Launch Tray Application
echo [Step 4/4] Launching Tray Manager...
:: Start the tray launcher using pythonw (no window)
start "" venv\Scripts\pythonw tray_launcher.py

echo.
echo ==========================================
echo   TOEIC Helper is now in your SYSTEM TRAY!
echo   (Check the bottom-right corner icon)
echo ==========================================
timeout /t 2
exit

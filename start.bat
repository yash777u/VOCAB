@echo off
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo Node.js 18 or newer is required to run German Vocab Studio.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo Installing the React app dependencies...
    call npm install
    if errorlevel 1 (
        pause
        exit /b 1
    )
)

echo Starting German Vocab Studio...
call npm run dev
pause

@echo off
title TriagePulse - Healthcare IoT & Patient Triage System
color 0B

echo ===============================================================================
echo                 TriagePulse - Launching Local Demo System
echo      Trajectory-aware patient monitoring, IV oversight, and nurse triage
echo              (SIMULATION / EDUCATIONAL PROTOTYPE - NOT FOR CLINICAL USE)
echo ===============================================================================
echo.

cd /d "%~dp0"

echo [1/3] Verifying Backend Dependencies...
cd backend
python -m pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo [WARNING] Pip install had warnings, proceeding...
)

echo.
echo [2/3] Starting FastAPI Backend on http://localhost:8000 ...
start "TriagePulse Backend" cmd /k "color 0A && echo TriagePulse Backend Server Running... && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

cd ..\frontend
echo.
echo [3/3] Starting Vite Frontend on http://localhost:5173 ...
if not exist "node_modules" (
    echo Installing frontend packages...
    call npm.cmd install
)

start "TriagePulse Frontend" cmd /k "color 0E && echo TriagePulse Frontend Running... && call npm.cmd run dev"

echo.
echo ===============================================================================
echo  TriagePulse MVP is now RUNNING!
echo  - Frontend Dashboard: http://localhost:5173
echo  - Backend REST API:   http://localhost:8000/docs
echo  - Real-Time WS:       ws://localhost:8000/ws
echo ===============================================================================
echo.
timeout /t 3 >nul
start http://localhost:5173

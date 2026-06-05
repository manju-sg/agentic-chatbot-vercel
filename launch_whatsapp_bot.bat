@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "ENV_FILE=%BACKEND%\.env"

echo =============================================================
echo   AgenticChatbot WhatsApp Launcher
echo =============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not available in PATH.
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm is not installed or not available in PATH.
    pause
    exit /b 1
)

where ngrok >nul 2>nul
if errorlevel 1 (
    echo [ERROR] ngrok is not installed or not available in PATH.
    pause
    exit /b 1
)

if not exist "%ENV_FILE%" (
    echo [ERROR] backend\.env not found.
    pause
    exit /b 1
)

echo [INFO] Checking backend dependencies...
if not exist "%BACKEND%\node_modules" (
    echo [INFO] node_modules not found. Installing backend dependencies...
    pushd "%BACKEND%"
    call npm install
    if errorlevel 1 (
        popd
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
    popd
)

set "NGROK_TOKEN="
for /f "usebackq tokens=1,* delims==" %%a in ("%ENV_FILE%") do (
    if /i "%%a"=="NGROK_AUTHTOKEN" set "NGROK_TOKEN=%%b"
)

if defined NGROK_TOKEN (
    echo [INFO] Configuring ngrok authtoken from backend\.env
    ngrok config add-authtoken !NGROK_TOKEN! >nul 2>nul
) else (
    echo [WARNING] NGROK_AUTHTOKEN not found in backend\.env
)

echo [INFO] Starting backend server window...
start "AgenticChatbot Backend" cmd /k "cd /d ""%BACKEND%"" && node server.js"

echo [INFO] Waiting for backend to come up...
set "READY="
for /l %%i in (1,1,20) do (
    powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing 'http://localhost:3001/health' -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
    if not errorlevel 1 (
        set "READY=1"
        goto :backend_ready
    )
    timeout /t 1 /nobreak >nul
)

:backend_ready
if not defined READY (
    echo [WARNING] Backend health check did not respond yet.
    echo [WARNING] The backend window may show the reason.
) else (
    echo [INFO] Backend is responding on http://localhost:3001/health
)

echo [INFO] Starting ngrok tunnel window...
start "AgenticChatbot ngrok" cmd /k "ngrok http 3001"

echo.
echo =============================================================
echo   WhatsApp stack started
echo =============================================================
echo   1. Backend window is running on port 3001
echo   2. ngrok window is forwarding public traffic to localhost:3001
echo.
echo   In Twilio, use:
echo   https://YOUR-NGROK-URL/whatsapp/incoming
echo   Method: POST
echo.
echo   Test local health here:
echo   http://localhost:3001/health
echo =============================================================
echo.
pause

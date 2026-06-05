@echo off
setlocal

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "BACKEND_PORT=3001"
set "BACKEND_HEALTH=http://localhost:%BACKEND_PORT%/health"

echo =============================================================
echo   AgenticChatbot Vercel Backend Launcher
echo =============================================================
echo.
echo This launcher starts the LOCAL laptop backend so your
echo Vercel-hosted frontend can send prompts to this machine.
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not available in PATH.
  echo Install Node.js, then run this file again.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm is not installed or not available in PATH.
  echo Install Node.js with npm, then run this file again.
  echo.
  pause
  exit /b 1
)

echo [1/3] Checking backend dependencies...
if not exist "%BACKEND_DIR%\node_modules" (
  cd /d "%BACKEND_DIR%"
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] Backend dependency install failed.
    pause
    exit /b 1
  )
)

echo [2/4] Ensuring port %BACKEND_PORT% is free...
for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "$p = Get-NetTCPConnection -LocalPort %BACKEND_PORT% -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess; if ($p) { Write-Output $p }"`) do (
  echo [INFO] Stopping previous backend process on port %BACKEND_PORT%: %%P
  taskkill /PID %%P /F >nul 2>nul
)

echo [3/4] Starting Chrome in debug mode...
start "Agentic Chrome Debug" cmd /k "cd /d ""%ROOT%"" && call launch_chrome_debug.bat"

echo [4/4] Starting local backend...
start "Agentic Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && node server.js"

echo.
echo Local backend health:
echo   %BACKEND_HEALTH%
echo.

where ngrok >nul 2>nul
if not errorlevel 1 (
  echo [INFO] ngrok detected. Starting public tunnel for Vercel...
  start "Agentic ngrok Tunnel" cmd /k "ngrok http %BACKEND_PORT%"
  echo [INFO] Copy the HTTPS ngrok URL and set it as Vercel env var:
  echo        VITE_BACKEND_URL=https://your-ngrok-url
  echo.
  goto :done
)

where cloudflared >nul 2>nul
if not errorlevel 1 (
  echo [INFO] cloudflared detected. Starting public tunnel for Vercel...
  start "Agentic Cloudflare Tunnel" cmd /k "cloudflared tunnel --url http://localhost:%BACKEND_PORT%"
  echo [INFO] Copy the HTTPS tunnel URL and set it as Vercel env var:
  echo        VITE_BACKEND_URL=https://your-tunnel-url
  echo.
  goto :done
)

echo [WARNING] No tunnel tool was found.
echo To accept prompts from your Vercel frontend, start one of these manually:
echo.
echo   ngrok http %BACKEND_PORT%
echo   OR
echo   cloudflared tunnel --url http://localhost:%BACKEND_PORT%
echo.
echo Then set your Vercel env var to that public URL:
echo   VITE_BACKEND_URL=https://your-public-tunnel-url
echo.

:done
echo Keep the backend and Chrome windows open while using the app.
echo.
pause

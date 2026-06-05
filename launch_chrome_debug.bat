@echo off
echo =============================================================
echo   AGENTIC AI BROWSER - Chrome Debug Launcher
echo =============================================================
echo.
echo FIRST TIME SETUP (do this once):
echo   1. Close this window
echo   2. Open Chrome normally and log into Gmail/Google
echo   3. Close Chrome completely
echo   4. Run this .bat file again
echo.
echo If you've already done the above, press any key to continue...
pause >nul

echo.
echo Killing any existing Chrome processes...
taskkill /F /IM chrome.exe 2>nul
timeout /t 2 /nobreak >nul

echo Starting Chrome with your saved profile + debug mode...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --remote-debugging-port=9222 ^
  --user-data-dir="%LOCALAPPDATA%\Google\Chrome\User Data" ^
  --profile-directory="Default" ^
  --disable-blink-features=AutomationControlled ^
  --no-first-run ^
  --no-default-browser-check

echo.
echo Chrome is running with your saved sessions!
echo Your Gmail and Google accounts are already logged in.
echo.
echo You can now run: npm start (in backend folder)
echo.
timeout /t 5 /nobreak >nul

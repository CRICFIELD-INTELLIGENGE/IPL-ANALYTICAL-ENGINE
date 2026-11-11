@echo off
rem CRICFIELD local launcher - starts the API (:5000) and the site (:3000) with plain node, no pnpm.
rem Double-click to start. Close the two server windows to stop.
title CRICFIELD launcher
setlocal
cd /d "%~dp0"

where node >nul 2>&1 || (echo Node.js is not installed or not on PATH. & pause & exit /b 1)
if not exist "artifacts\api-server\node_modules\tsx" (echo Dependencies are missing: artifacts\api-server\node_modules\tsx not found. & pause & exit /b 1)
if not exist "artifacts\ipl-analytics\node_modules\vite\bin\vite.js" (echo Dependencies are missing: artifacts\ipl-analytics\node_modules\vite not found. & pause & exit /b 1)

rem API on :5000 (the warehouse is opened read-only, the same as the dev-server autostart)
netstat -ano | findstr /r /c:":5000 .*LISTENING" >nul
if %errorlevel%==0 (
  echo API already running on http://localhost:5000 - leaving it as is.
) else (
  echo Starting API on http://localhost:5000 ...
  start "CRICFIELD API :5000" /d "%~dp0artifacts\api-server" cmd /k "set PORT=5000&& set CRICFIELD_DB_READONLY=1&& node --import tsx src/index.ts"
)

rem Site on :3000 (API autostart is off because the API window above owns :5000)
netstat -ano | findstr /r /c:":3000 .*LISTENING" >nul
if %errorlevel%==0 (
  echo Site already running on http://localhost:3000 - leaving it as is.
) else (
  echo Starting site on http://localhost:3000 ...
  start "CRICFIELD site :3000" /d "%~dp0artifacts\ipl-analytics" cmd /k "set PORT=3000&& set VITE_BACKEND_PORT=5000&& set BASE_PATH=/&& set CRICFIELD_API_AUTOSTART=0&& node node_modules\vite\bin\vite.js --config vite.config.ts --host 0.0.0.0"
)

rem Wait up to ~90 s for the site to answer, then open the browser.
echo Waiting for the site...
for /l %%i in (1,1,45) do (
  powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://127.0.0.1:3000/) | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1 && goto ready
  timeout /t 2 /nobreak >nul
)
echo The site did not answer within 90 seconds. Check the "CRICFIELD site :3000" window for errors.
pause
exit /b 1

:ready
echo Ready: http://localhost:3000  (the API can take about a minute more to load its data)
start "" "http://localhost:3000/arcade"
endlocal

@echo off
setlocal
cd /d "%~dp0artifacts\ipl-analytics"
set "CRICFIELD_API_AUTOSTART=0"
set "VITE_BACKEND_PORT=5055"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Open this project in a terminal with Node.js available.
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  echo The installed Vite dependency could not be found.
  pause
  exit /b 1
)
echo.
echo CricField mobile preview
echo Open http://127.0.0.1:3068/mobile-preview.html
echo Keep this window open while reviewing. Press Ctrl+C to stop.
echo.
node node_modules\vite\bin\vite.js --config vite.config.ts --port 3068 --host 127.0.0.1
if errorlevel 1 pause

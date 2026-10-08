@echo off
title IPL Intelligence OS - Startup
color 0A
echo.
echo  ==========================================
echo   IPL Intelligence OS - Starting Up...
echo  ==========================================
echo.

cd /d "%~dp0"

echo  [1/2] Starting API Server on port 5000...
start "IPL API Server :5000" cmd /k "cd /d %~dp0 && set PORT=5000 && pnpm --filter @workspace/api-server dev"

timeout /t 4 /nobreak >nul

echo  [2/2] Starting Frontend on port 3000...
start "IPL Frontend :3000" cmd /k "cd /d %~dp0 && set PORT=3000 && set VITE_BACKEND_PORT=5000 && pnpm --filter @workspace/ipl-analytics dev"

timeout /t 5 /nobreak >nul

echo.
echo  ==========================================
echo   Both services launched!
echo   - Frontend : http://localhost:3000
echo   - API      : http://localhost:5000
echo  ==========================================
echo.
echo  Opening browser...
start "" "http://localhost:3000"

echo.
echo  Press any key to close this window.
echo  (Keep the two server windows open!)
pause >nul

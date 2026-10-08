@echo off
title IPL Intelligence OS Launcher
setlocal enabledelayedexpansion

echo ===================================================
echo   IPL Intelligence OS - Data Insight Engine
echo ===================================================
echo.

:: Auto-detect available port: start from base port, increment until found
set BASE_FRONTEND_PORT=3000
set BASE_BACKEND_PORT=5000
set FRONTEND_PORT=%BASE_FRONTEND_PORT%
set BACKEND_PORT=%BASE_BACKEND_PORT%

:: Find available frontend port
:check_frontend
netstat -ano | findstr ":%FRONTEND_PORT% " >nul 2>&1
if !errorlevel! equ 0 (
    set /a FRONTEND_PORT+=1
    goto check_frontend
)

:: Find available backend port
:check_backend
netstat -ano | findstr ":%BACKEND_PORT% " >nul 2>&1
if !errorlevel! equ 0 (
    set /a BACKEND_PORT+=1
    goto check_backend
)

echo [Port Detection] Frontend: !FRONTEND_PORT! ^(base: %BASE_FRONTEND_PORT%^)
echo [Port Detection] Backend:  !BACKEND_PORT! ^(base: %BASE_BACKEND_PORT%^)
echo.

:: Start backend API server
echo Starting Express API Server on Port !BACKEND_PORT!...
start "IPL API Server [Port !BACKEND_PORT!]" cmd /k "set PORT=!BACKEND_PORT! && pnpm --filter @workspace/api-server dev"

:: Start frontend Vite dev server with backend port passed for proxy
echo Starting React Vite Frontend on Port !FRONTEND_PORT!...
start "IPL Vite Frontend [Port !FRONTEND_PORT!]" cmd /k "set PORT=!FRONTEND_PORT! && set BASE_PATH=/ && set VITE_BACKEND_PORT=!BACKEND_PORT! && pnpm --filter @workspace/ipl-analytics dev"

echo.
echo ===================================================
echo   SUCCESS: Both services launched successfully!
echo ===================================================
echo   - Backend API: http://localhost:!BACKEND_PORT!
echo   - Frontend UI: http://localhost:!FRONTEND_PORT!
echo.
echo   Keep the separate console windows open to view logs.
echo   To shut down, simply close the opened console windows.
echo ===================================================
echo.
pause
endlocal

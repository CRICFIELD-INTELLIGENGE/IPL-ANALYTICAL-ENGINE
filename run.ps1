# IPL Intelligence OS PowerShell Launcher

Write-Host "===================================================" -ForegroundColor Green
Write-Host "  IPL Intelligence OS - Data Insight Engine" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host ""

# Auto-detect available ports: start from base, increment until found
$baseFrontendPort = 3000
$baseBackendPort = 5000
$frontendPort = $baseFrontendPort
$backendPort = $baseBackendPort

# Find available frontend port
while ($true) {
    $inUse = Get-NetTCPConnection -LocalPort $frontendPort -ErrorAction SilentlyContinue
    if (-not $inUse) { break }
    $frontendPort++
}

# Find available backend port
while ($true) {
    $inUse = Get-NetTCPConnection -LocalPort $backendPort -ErrorAction SilentlyContinue
    if (-not $inUse) { break }
    $backendPort++
}

Write-Host "[Port Detection] Frontend: $frontendPort (base: $baseFrontendPort)" -ForegroundColor Magenta
Write-Host "[Port Detection] Backend:  $backendPort (base: $baseBackendPort)" -ForegroundColor Magenta
Write-Host ""

Write-Host "Starting Express API Server on Port $backendPort..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; `$env:PORT='$backendPort'; pnpm --filter @workspace/api-server dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "Starting React Vite Frontend on Port $frontendPort..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; `$env:PORT='$frontendPort'; `$env:VITE_BACKEND_PORT='$backendPort'; pnpm --filter @workspace/ipl-analytics dev" -WindowStyle Normal

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  SUCCESS: Both services are launching!" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  - Backend API: http://localhost:$backendPort" -ForegroundColor Cyan
Write-Host "  - Frontend UI: http://localhost:$frontendPort" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Keep the opened terminal windows open to view logs." -ForegroundColor Gray
Write-Host "  To shut down, close the opened terminal windows." -ForegroundColor Gray
Write-Host "===================================================" -ForegroundColor Green
Write-Host ""

# Stops the API and tunnel. -Uninstall also removes the scheduled tasks (data and logs are kept).
param([switch]$Uninstall)
. (Join-Path $PSScriptRoot 'common.ps1')
foreach ($name in 'CricField Tunnel', 'CricField Analytics API') {
    if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) { Stop-ScheduledTask -TaskName $name; Write-Host "Stopped task: $name" }
}
# The supervisors' children: only node processes running this repo's API bundle, and cloudflared.
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like "*$ApiEntry*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Host "Stopped API process $($_.ProcessId)" }
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
if ($Uninstall) {
    foreach ($name in 'CricField Tunnel', 'CricField Analytics API', 'CricField Backup') {
        if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) { Unregister-ScheduledTask -TaskName $name -Confirm:$false; Write-Host "Removed task: $name" }
    }
}

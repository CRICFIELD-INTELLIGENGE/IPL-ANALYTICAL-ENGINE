# Registers two scheduled tasks that start at boot and are restarted by Task Scheduler if they stop.
#   -AtStartup : start at boot without anyone logging in (run from an ADMINISTRATOR PowerShell).
#   default    : start when you log in (no admin needed; the laptop must be signed in after a reboot).
# Also adds a daily 03:30 database backup task when -BackupDestination is given.
param([switch]$AtStartup, [string]$BackupDestination)
. (Join-Path $PSScriptRoot 'common.ps1')

$ps = (Get-Command powershell.exe).Source
$user = "$env:USERDOMAIN\$env:USERNAME"
$trigger = if ($AtStartup) { New-ScheduledTaskTrigger -AtStartup } else { New-ScheduledTaskTrigger -AtLogOn -User $user }
# S4U: runs without a stored password and without the user logged in; outbound internet still works.
$principal = if ($AtStartup) { New-ScheduledTaskPrincipal -UserId $user -LogonType S4U -RunLevel Limited }
             else { New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited }
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
    -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew

foreach ($t in @(@{ Name = 'CricField Analytics API'; Script = 'run-analytics.ps1' }, @{ Name = 'CricField Tunnel'; Script = 'run-tunnel.ps1' })) {
    $action = New-ScheduledTaskAction -Execute $ps -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$(Join-Path $PSScriptRoot $t.Script)`"" -WorkingDirectory $RepoRoot
    Register-ScheduledTask -TaskName $t.Name -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
    Write-Host "Registered: $($t.Name)"
}

if ($BackupDestination) {
    $action = New-ScheduledTaskAction -Execute $ps -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$(Join-Path $PSScriptRoot 'backup-databases.ps1')`" -Destination `"$BackupDestination`"" -WorkingDirectory $RepoRoot
    $daily = New-ScheduledTaskTrigger -Daily -At 03:30
    Register-ScheduledTask -TaskName 'CricField Backup' -Action $action -Trigger $daily -Principal $principal -Settings (New-ScheduledTaskSettingsSet -StartWhenAvailable) -Force | Out-Null
    Write-Host "Registered: CricField Backup (daily 03:30 to $BackupDestination)"
}
Write-Host 'Start now with:  Start-ScheduledTask "CricField Analytics API"; Start-ScheduledTask "CricField Tunnel"'

# Runs the analytics API and restarts it if it exits. Started by the "CricField Analytics API" scheduled task.
# Restart backoff: 5 s, doubling to 5 min; reset after 10 minutes of healthy running.
. (Join-Path $PSScriptRoot 'common.ps1')
Import-CricFieldEnv
if (-not (Test-Path $ApiEntry)) { throw "Build first: pnpm --filter @workspace/api-server run build (missing $ApiEntry)" }
foreach ($db in $IplDb, $ScoutDb) { if (-not (Test-Path $db)) { throw "Database missing: $db" } }

# PowerShell 5.1 turns a native program's stderr lines into error records; with 'Stop' (common.ps1) the first
# warning Node prints would kill this supervisor. Checks above ran under 'Stop'; the loop must not.
$ErrorActionPreference = 'Continue'
$delay = 5
while ($true) {
    Remove-OldLogs
    $log = Join-Path $LogDir "api-$(Get-Date -Format yyyyMMdd).log"
    Write-Log 'supervisor' "starting API on port $env:PORT"
    $started = Get-Date
    # 2 GB heap cap: the warehouse caches are bounded well below this on a 16 GB laptop.
    & node --max-old-space-size=2048 --enable-source-maps $ApiEntry *>> $log
    $code = $LASTEXITCODE
    $ran = ((Get-Date) - $started).TotalSeconds
    Write-Log 'supervisor' "API exited with code $code after $([int]$ran) s; restarting in $delay s"
    if ($ran -gt 600) { $delay = 5 }
    Start-Sleep -Seconds $delay
    $delay = [Math]::Min(300, $delay * 2)
}

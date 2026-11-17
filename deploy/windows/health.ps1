# One-screen diagnostics: local API, keyed analytics health, public tunnel path, tasks, CPU/RAM/disk, recent errors.
#   -Logs <n> : also print the last n lines of today's API and tunnel logs.
param([int]$Logs = 0)
. (Join-Path $PSScriptRoot 'common.ps1')
Import-CricFieldEnv
$local = "http://127.0.0.1:$env:PORT"
$headers = @{ 'x-cricfield-analytics-key' = $env:ANALYTICS_GATE_KEY }

# Prints one PASS/FAIL line (Write-Host, so it is never swallowed) and returns the body.
function Probe([string]$Label, [string]$Url, [hashtable]$H = @{}, [int]$Expect = 200) {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $code = 'no response'; $body = $null
    try {
        $r = Invoke-WebRequest -Uri $Url -Headers $H -UseBasicParsing -TimeoutSec 30
        $code = [int]$r.StatusCode; $body = $r.Content
    } catch {
        if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    }
    $verdict = if ($code -eq $Expect) { 'PASS' } else { 'FAIL' }
    Write-Host ('{0} {1,-26} {2} in {3} ms' -f $verdict, $Label, $code, $sw.ElapsedMilliseconds)
    return $body
}

'--- Endpoints'
$null = Probe 'Local liveness' "$local/api/healthz"
$h = Probe 'Local analytics health' "$local/api/analytics/health" $headers
if ($h -and $h -match '^\{') { $j = $h | ConvertFrom-Json; '  status={0} inFlight={1} served={2} rejected={3} busy={4} rssMB={5} readOnly={6}' -f $j.status, $j.inFlight, $j.served, $j.rejected, $j.busy, $j.memoryMb.rss, $j.readOnly }
$null = Probe 'Local sample query' "$local/api/stats/query?season=2024&phase=Death" $headers
$null = Probe 'Unkeyed query refused' "$local/api/stats/query?season=2024" @{} 401
if ($env:CRICFIELD_PUBLIC_URL) {
    $null = Probe 'Tunnel liveness' "$env:CRICFIELD_PUBLIC_URL/api/healthz"
    $null = Probe 'Tunnel keyed query' "$env:CRICFIELD_PUBLIC_URL/api/stats/query?season=2024&phase=Death" $headers
}

'--- Scheduled tasks'
Get-ScheduledTask -TaskName 'CricField*' -ErrorAction SilentlyContinue | ForEach-Object { '{0,-28} {1}' -f $_.TaskName, $_.State }
'cloudflared running: {0}' -f [bool](Get-Process cloudflared -ErrorAction SilentlyContinue)

'--- Machine'
$cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
$os = Get-CimInstance Win32_OperatingSystem
'CPU {0}%   RAM free {1:N1} of {2:N1} GB' -f $cpu, ($os.FreePhysicalMemory / 1MB), ($os.TotalVisibleMemorySize / 1MB)
$drive = Get-PSDrive -Name ($RepoRoot.Substring(0, 1))
'Disk {0}: free {1:N1} GB' -f $drive.Name, ($drive.Free / 1GB)
foreach ($db in $IplDb, $ScoutDb) { if (Test-Path $db) { '{0,-12} {1:N0} MB' -f (Split-Path $db -Leaf), ((Get-Item $db).Length / 1MB) } }
if ($drive.Free -lt 5GB) { 'WARNING: under 5 GB free. Clear space yourself (e.g. Storage Sense, old Downloads); nothing is deleted automatically.' }

'--- Errors in today''s logs'
Get-ChildItem $LogDir -Filter "*-$(Get-Date -Format yyyyMMdd).log" -File | ForEach-Object {
    $n = (Select-String -Path $_.FullName -Pattern '"level":50|"level":60|ERR|error' -SimpleMatch:$false | Measure-Object).Count
    '{0,-28} {1} error lines' -f $_.Name, $n
}
if ($Logs -gt 0) { Get-ChildItem $LogDir -Filter "*-$(Get-Date -Format yyyyMMdd).log" -File | ForEach-Object { "=== $($_.Name)"; Get-Content $_.FullName -Tail $Logs } }

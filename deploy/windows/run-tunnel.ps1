# Runs the named Cloudflare Tunnel and restarts it if it exits. Started by the "CricField Tunnel" scheduled task.
# Outbound-only connection; no router ports are opened. Credentials stay in %USERPROFILE%\.cloudflared.
. (Join-Path $PSScriptRoot 'common.ps1')
Import-CricFieldEnv
$cloudflared = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cloudflared) { throw 'cloudflared is not installed: winget install --id Cloudflare.cloudflared' }
$config = Join-Path $StateDir 'cloudflared.yml'
if (-not (Test-Path $config)) { throw "Missing $config. Copy deploy\windows\cloudflared.example.yml there and fill in the tunnel id." }

# cloudflared logs to stderr; under 'Stop' PowerShell 5.1 would treat its first line as fatal.
$ErrorActionPreference = 'Continue'
$delay = 5
while ($true) {
    $log = Join-Path $LogDir "tunnel-$(Get-Date -Format yyyyMMdd).log"
    Write-Log 'supervisor' "starting tunnel $env:CRICFIELD_TUNNEL_NAME"
    $started = Get-Date
    & $cloudflared tunnel --no-autoupdate --config $config run $env:CRICFIELD_TUNNEL_NAME *>> $log
    $ran = ((Get-Date) - $started).TotalSeconds
    Write-Log 'supervisor' "tunnel exited with code $LASTEXITCODE after $([int]$ran) s; restarting in $delay s"
    if ($ran -gt 600) { $delay = 5 }
    Start-Sleep -Seconds $delay
    $delay = [Math]::Min(300, $delay * 2)
}

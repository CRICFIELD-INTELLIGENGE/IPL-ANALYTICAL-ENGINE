# Shared paths and helpers for the CricField laptop analytics host. Dot-source this file.
# Secrets and logs live in %LOCALAPPDATA%\CricField, never in the repository.
$ErrorActionPreference = 'Stop'

$script:RepoRoot   = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$script:StateDir   = Join-Path $env:LOCALAPPDATA 'CricField'
$script:LogDir     = Join-Path $StateDir 'logs'
$script:EnvFile    = Join-Path $StateDir 'analytics.env.ps1'
$script:ApiEntry   = Join-Path $RepoRoot 'artifacts\api-server\dist\index.mjs'
$script:IplDb      = Join-Path $RepoRoot 'sqlite.db'
$script:ScoutDb    = Join-Path $RepoRoot 'lib\cricket-data\global\warehouse\global.db'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Import-CricFieldEnv {
    if (-not (Test-Path $EnvFile)) { throw "Missing $EnvFile. Copy deploy\windows\analytics.env.example.ps1 there and fill it in." }
    . $EnvFile
    foreach ($name in 'ANALYTICS_GATE_KEY') {
        if (-not [Environment]::GetEnvironmentVariable($name, 'Process')) { throw "$name is not set in $EnvFile" }
    }
    # Fixed, non-secret settings for the public analytics role.
    $env:CRICFIELD_DB_READONLY = '1'
    $env:NODE_ENV = 'production'
    if (-not $env:PORT) { $env:PORT = '5100' }   # not 5000: keeps the developer server free
    if (-not $env:ANALYTICS_MAX_IN_FLIGHT) { $env:ANALYTICS_MAX_IN_FLIGHT = '6' }
    if (-not $env:RATE_LIMIT_HEAVY_PER_MIN) { $env:RATE_LIMIT_HEAVY_PER_MIN = '60' }
    $env:CRICFIELD_DB_PATH = $IplDb
    $env:CRICFIELD_SCOUT_DB_PATH = $ScoutDb
}

function Write-Log([string]$Name, [string]$Message) {
    $line = '{0:yyyy-MM-ddTHH:mm:ss} {1}' -f (Get-Date), $Message
    Add-Content -Path (Join-Path $LogDir "$Name-$(Get-Date -Format yyyyMMdd).log") -Value $line
}

# Keep 14 days of logs; never touches anything outside the CricField log folder.
function Remove-OldLogs {
    Get-ChildItem $LogDir -Filter '*.log' -File | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-14) } | Remove-Item -Force
}

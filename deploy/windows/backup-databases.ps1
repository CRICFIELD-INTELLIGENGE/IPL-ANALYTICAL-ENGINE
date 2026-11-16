# Consistent copies of sqlite.db and global.db (SQLite VACUUM INTO, safe while the API reads them), each checked with
# PRAGMA integrity_check and recorded with its SHA-256. A database whose source hash has not changed since the last
# good backup is skipped, so immutable data is not copied every night. Keeps the newest -Keep copies per database.
#   .\backup-databases.ps1 -Destination D:\CricFieldBackups        (preferably another drive or a synced folder)
#   .\backup-databases.ps1 -Restore <backup.db> -Target sqlite.db   (stop the API first; the old file is kept as .before-restore)
param([string]$Destination, [int]$Keep = 3, [string]$Restore, [ValidateSet('sqlite.db', 'global.db')][string]$Target)
. (Join-Path $PSScriptRoot 'common.ps1')
$tool = Join-Path $PSScriptRoot 'sqlite-tool.mjs'

if ($Restore) {
    if (-not $Target) { throw '-Target is required with -Restore' }
    & node $tool check $Restore | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Backup failed integrity_check: $Restore" }
    $dest = if ($Target -eq 'sqlite.db') { $IplDb } else { $ScoutDb }
    if (Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like "*$ApiEntry*" }) { throw 'Stop the API first: deploy\windows\stop-analytics.ps1' }
    Copy-Item $dest "$dest.before-restore" -Force
    Copy-Item $Restore $dest -Force
    Write-Host "Restored $Target from $Restore (previous file kept as $dest.before-restore)"
    return
}

if (-not $Destination) { throw '-Destination is required' }
New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$manifestPath = Join-Path $Destination 'manifest.json'
$state = if (Test-Path $manifestPath) { Get-Content $manifestPath -Raw | ConvertFrom-Json } else { New-Object PSObject }

foreach ($db in $IplDb, $ScoutDb) {
    $name = Split-Path $db -Leaf
    $stem = [IO.Path]::GetFileNameWithoutExtension($name)
    $hash = (Get-FileHash $db -Algorithm SHA256).Hash
    $prev = $state.PSObject.Properties[$name]
    if ($prev -and $prev.Value.sourceSha256 -eq $hash) { Write-Log 'backup' "$name unchanged since $($prev.Value.at); skipped"; continue }
    $free = (Get-PSDrive -Name $Destination.Substring(0, 1)).Free
    if ($free -lt (Get-Item $db).Length * 1.2) { Write-Log 'backup' "$name skipped: only $([int]($free / 1MB)) MB free at destination"; continue }
    $out = Join-Path $Destination ('{0}-{1:yyyyMMdd-HHmm}.db' -f $stem, (Get-Date))
    & node $tool backup $db $out | Out-Null
    if ($LASTEXITCODE -ne 0) { Remove-Item $out -Force -ErrorAction SilentlyContinue; Write-Log 'backup' "$name backup FAILED integrity_check; discarded"; continue }
    $entry = [pscustomobject]@{ sourceSha256 = $hash; file = (Split-Path $out -Leaf); backupSha256 = (Get-FileHash $out -Algorithm SHA256).Hash; at = (Get-Date).ToString('s') }
    $state | Add-Member -NotePropertyName $name -NotePropertyValue $entry -Force
    Write-Log 'backup' "$name -> $out (integrity ok)"
    Get-ChildItem $Destination -Filter "$stem-*.db" | Sort-Object LastWriteTime -Descending | Select-Object -Skip $Keep | Remove-Item -Force
}
$state | ConvertTo-Json | Set-Content $manifestPath -Encoding utf8
Get-Content (Join-Path $LogDir "backup-$(Get-Date -Format yyyyMMdd).log") -Tail 4

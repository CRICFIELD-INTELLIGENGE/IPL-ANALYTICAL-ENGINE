# Prints a new 64-character random key for ANALYTICS_GATE_KEY / CRICFIELD_ANALYTICS_KEY. Nothing is written to disk.
$bytes = New-Object byte[] 48
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes).Replace('+', '-').Replace('/', '_')

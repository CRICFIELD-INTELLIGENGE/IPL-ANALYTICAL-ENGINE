# Copy to %LOCALAPPDATA%\CricField\analytics.env.ps1 and fill in. That file is outside the repository.
# Generate the key with:  deploy\windows\new-key.ps1
# The SAME key goes into Vercel as CRICFIELD_ANALYTICS_KEY.

$env:ANALYTICS_GATE_KEY = '<paste a 64-character random key>'

# Optional overrides
# $env:PORT = '5100'
# $env:ANALYTICS_MAX_IN_FLIGHT = '6'
# $env:RATE_LIMIT_HEAVY_PER_MIN = '60'

# Cloudflare Tunnel name (created with: cloudflared tunnel create cricfield-analytics)
$env:CRICFIELD_TUNNEL_NAME = 'cricfield-analytics'
# Public hostname, used only by health.ps1 to test the tunnel end to end
$env:CRICFIELD_PUBLIC_URL = 'https://api.cricfield.in'

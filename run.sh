#!/bin/bash

# IPL Intelligence OS Bash Launcher

echo "==================================================="
echo "  IPL Intelligence OS - Data Insight Engine"
echo "==================================================="
echo ""

# Handle graceful shutdown of background processes on Ctrl+C
cleanup() {
    echo ""
    echo "Stopping all active servers..."
    kill $(jobs -p) 2>/dev/null
    echo "Servers stopped. Exiting."
    exit 0
}
trap cleanup SIGINT SIGTERM

# --- Auto-detect available ports ---
# Checks if port is in use using ss (preferred) or lsof
port_in_use() {
  local port=$1
  if command -v ss &>/dev/null; then
    ss -tln "sport = :$port" 2>/dev/null | grep -q ":$port"
  elif command -v lsof &>/dev/null; then
    lsof -iTCP:"$port" -sTCP:LISTEN -P -n 2>/dev/null | grep -q ":$port"
  else
    # fallback: try connecting with nc
    (echo >/dev/tcp/127.0.0.1/$port) 2>/dev/null
  fi
  return $?
}

BASE_FRONTEND_PORT=3000
BASE_BACKEND_PORT=5000
FRONTEND_PORT=$BASE_FRONTEND_PORT
BACKEND_PORT=$BASE_BACKEND_PORT

while port_in_use $FRONTEND_PORT; do
  FRONTEND_PORT=$((FRONTEND_PORT + 1))
done

while port_in_use $BACKEND_PORT; do
  BACKEND_PORT=$((BACKEND_PORT + 1))
done

echo "[Port Detection] Frontend: $FRONTEND_PORT (base: $BASE_FRONTEND_PORT)"
echo "[Port Detection] Backend:  $BACKEND_PORT (base: $BASE_BACKEND_PORT)"
echo ""

echo "Starting Express API Server on Port $BACKEND_PORT..."
PORT=$BACKEND_PORT pnpm --filter @workspace/api-server dev &

echo "Starting React Vite Frontend on Port $FRONTEND_PORT..."
PORT=$FRONTEND_PORT BASE_PATH=/ VITE_BACKEND_PORT=$BACKEND_PORT pnpm --filter @workspace/ipl-analytics dev &

echo ""
echo "==================================================="
echo "  SUCCESS: Both services running!"
echo "==================================================="
echo "  - Backend API: http://localhost:$BACKEND_PORT"
echo "  - Frontend UI: http://localhost:$FRONTEND_PORT"
echo ""
echo "  Press [Ctrl + C] in this window to stop both servers."
echo "==================================================="
echo ""

# Wait for all background jobs to complete (prevents script from exiting immediately)
wait

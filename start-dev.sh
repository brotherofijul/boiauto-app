#!/bin/bash
# /home/z/my-project/boiauto-app/start-dev.sh
# Starts BOIAuto server + bot client together for development/demo

cd "$(dirname "$0")"

echo "=========================================="
echo "  BOIAuto - Starting dev environment"
echo "=========================================="

# Kill any existing processes
pkill -f "bun src/server" 2>/dev/null
pkill -f "bun.*bot-client" 2>/dev/null
sleep 1

# Start server in background
echo "[1/2] Starting BOIAuto server (port 3000)..."
/bin/sh -c 'exec bun src/server.js > /tmp/boiauto.log 2>&1' &
SERVER_PID=$!
echo "    Server PID: $SERVER_PID"

# Wait for server to be ready
sleep 2
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/bots | grep -q "200"; then
  echo "    Server ready ✓"
else
  echo "    Server failed to start ✗"
  cat /tmp/boiauto.log
  exit 1
fi

# Start bot client in background
echo "[2/2] Starting bot client (WS connection)..."
/bin/sh -c 'exec bun run client/bot/bot-client.js > /tmp/bot-client.log 2>&1' &
CLIENT_PID=$!
echo "    Bot client PID: $CLIENT_PID"

sleep 2
echo ""
echo "=========================================="
echo "  Dev environment running!"
echo "=========================================="
echo "  Server:      http://localhost:3000"
echo "  Bot client:  connected via WS"
echo "  Server log:  /tmp/boiauto.log"
echo "  Client log:  /tmp/bot-client.log"
echo "=========================================="
echo ""

# Verify bot is connected
BOT_STATUS=$(curl -s http://localhost:3000/api/bots | python3 -c "
import sys, json
bots = json.load(sys.stdin)
for b in bots:
    print(f\"  {b['name']}: {b['status']}\")
" 2>/dev/null)
echo "Bot status:"
echo "$BOT_STATUS"

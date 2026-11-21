#!/usr/bin/env bash
# ==============================================================================
# Buna Fair Price (ቡና ዋጋ) — Fullstack Platform Launcher
# Jimma Coffee Smallholder Empowerment & ECX Price Transparency
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "☕ [Buna Fair Price] Initializing fullstack platform..."

# 1. Start MongoDB if not already running on port 27017
if ! ss -tulpn 2>/dev/null | grep -q ":27017"; then
  echo "🍃 Starting MongoDB on port 27017..."
  mkdir -p /tmp/mongodb_data
  mongod --dbpath /tmp/mongodb_data --port 27017 --fork --logpath /tmp/mongodb.log || true
else
  echo "🍃 MongoDB already running on port 27017."
fi

# 2. Trap for clean shutdown
cleanup() {
  echo ""
  echo "🛑 Shutting down server and client..."
  kill $(jobs -p) 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 3. Start Backend Server (Port 5000)
echo "🚀 Starting Express TypeScript Server on http://localhost:5000..."
(cd "$DIR/server" && npm run dev) &
SERVER_PID=$!

# Wait a moment for server initialization
sleep 2

# 4. Start Next.js Frontend (Port 3000)
echo "🌐 Starting Next.js Frontend on http://localhost:3000..."
(cd "$DIR/client" && npm run dev) &
CLIENT_PID=$!

echo ""
echo "=================================================================="
echo "☕ BUNA FAIR PRICE FULLSTACK APPLICATION IS LIVE!"
echo "=================================================================="
echo "🌐 Frontend Client:  http://localhost:3000"
echo "📡 Backend REST API: http://localhost:5000/api/v1"
echo "📖 Health Endpoint:  http://localhost:5000/api/v1/health"
echo "=================================================================="
echo "Press Ctrl+C to terminate all services."
echo ""

wait

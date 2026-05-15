#!/bin/bash
# start.sh — Launches both the backend server and the frontend dashboard

set -e

# Get the directory where this script lives (so it works from anywhere)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for pretty output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No color

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Daily Options Plays — Starting Up...     ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"
echo ""

# Kill any existing processes from previous runs
echo -e "${YELLOW}→ Cleaning up old processes...${NC}"
pkill -f "node server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# Check .env exists
if [ ! -f "$SCRIPT_DIR/server/.env" ]; then
  echo -e "${RED}✗ Missing .env file at $SCRIPT_DIR/server/.env${NC}"
  echo -e "${YELLOW}  Create it with your Anthropic API key:${NC}"
  echo "    ANTHROPIC_API_KEY=sk-ant-your-key-here"
  echo "    PORT=3001"
  exit 1
fi

# Start backend
echo -e "${YELLOW}→ Starting backend server (port 3001)...${NC}"
cd "$SCRIPT_DIR/server"
node server.js > "$SCRIPT_DIR/server.log" 2>&1 &
BACKEND_PID=$!
sleep 2

# Verify backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
  echo -e "${RED}✗ Backend failed to start. Check $SCRIPT_DIR/server.log${NC}"
  cat "$SCRIPT_DIR/server.log"
  exit 1
fi
echo -e "${GREEN}✓ Backend running (PID $BACKEND_PID)${NC}"

# Start frontend
echo -e "${YELLOW}→ Starting frontend dashboard (port 5173)...${NC}"
cd "$SCRIPT_DIR/frontend"
npm run dev > "$SCRIPT_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
sleep 3

# Verify frontend is running
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
  echo -e "${RED}✗ Frontend failed to start. Check $SCRIPT_DIR/frontend.log${NC}"
  cat "$SCRIPT_DIR/frontend.log"
  kill $BACKEND_PID 2>/dev/null || true
  exit 1
fi
echo -e "${GREEN}✓ Frontend running (PID $FRONTEND_PID)${NC}"

# Open browser
sleep 1
echo ""
echo -e "${CYAN}→ Opening dashboard in your browser...${NC}"
open "http://localhost:5173"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Dashboard is now running!         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Dashboard:   ${CYAN}http://localhost:5173${NC}"
echo -e "  Backend API: ${CYAN}http://localhost:3001${NC}"
echo ""
echo -e "  Logs:"
echo -e "    Backend:  ${YELLOW}tail -f $SCRIPT_DIR/server.log${NC}"
echo -e "    Frontend: ${YELLOW}tail -f $SCRIPT_DIR/frontend.log${NC}"
echo ""
echo -e "  ${RED}To stop everything:${NC} run ${CYAN}./stop.sh${NC} (or press Ctrl+C in this window)"
echo ""

# Trap Ctrl+C to clean up
cleanup() {
  echo ""
  echo -e "${YELLOW}→ Shutting down...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  pkill -f "node server.js" 2>/dev/null || true
  pkill -f "vite" 2>/dev/null || true
  echo -e "${GREEN}✓ Stopped${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

# Wait so script doesn't exit (keeps services running until Ctrl+C)
wait

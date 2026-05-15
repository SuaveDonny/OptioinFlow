#!/bin/bash
# stop.sh — Stops the backend and frontend servers

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${YELLOW}→ Stopping Options Plays services...${NC}"
pkill -f "node server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1
echo -e "${GREEN}✓ All services stopped${NC}"

#!/bin/bash

# --- Color Definitions ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${BLUE}${BOLD}====================================================${NC}"
echo -e "${BLUE}${BOLD}   🚀 Personal Finance Tracker - Startup System     ${NC}"
echo -e "${BLUE}${BOLD}====================================================${NC}"

# --- Configuration ---
BACKEND_DIR="backend"
FRONTEND_PORT=5173
BACKEND_PORT=5000
MONGO_PORT=27017

# --- Cleanup Function ---
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"
    # Kill all background jobs started by this script
    JOBS=$(jobs -p)
    if [ -n "$JOBS" ]; then
        kill $JOBS 2>/dev/null
        echo -e "${GREEN}✅ Processes terminated.${NC}"
    else
        echo -e "${CYAN}ℹ️ No background processes found to terminate.${NC}"
    fi
    exit
}

# Trap Ctrl+C (SIGINT)
trap cleanup SIGINT

# --- 1. Environment Checks ---
echo -e "\n${BOLD}🔍 Phase 1: Environment Checks${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js is not installed. Please install it first.${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Node.js: $(node -v)${NC}"
fi

# Check MongoDB
echo -e "${CYAN}📡 Checking MongoDB...${NC}"
if ! nc -z 127.0.0.1 $MONGO_PORT &>/dev/null; then
    echo -e "${YELLOW}⚠️ Warning: MongoDB does not seem to be running on port $MONGO_PORT.${NC}"
    echo -e "${YELLOW}   Make sure your MongoDB server is active for the backend to work.${NC}"
else
    echo -e "${GREEN}✅ MongoDB is running.${NC}"
fi

# Check Port Availability
check_port() {
    if nc -z 127.0.0.1 $1 &>/dev/null; then
        echo -e "${RED}❌ Error: Port $1 is already in use.${NC}"
        return 1
    fi
    return 0
}

# --- 2. Setup (Dependencies & Envs) ---
echo -e "\n${BOLD}📦 Phase 2: Setup & Dependencies${NC}"

# Frontend .env
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}📄 Creating frontend .env from .env.example...${NC}"
        cp .env.example .env
    else
        echo -e "${RED}❌ Error: .env.example not found in root.${NC}"
    fi
fi

# Backend .env
if [ ! -f "$BACKEND_DIR/.env" ]; then
    if [ -f "$BACKEND_DIR/.env.example" ]; then
        echo -e "${YELLOW}📄 Creating backend .env from .env.example...${NC}"
        cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    else
        echo -e "${RED}❌ Error: .env.example not found in $BACKEND_DIR.${NC}"
    fi
fi

# Install Backend Deps
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    echo -e "${CYAN}📥 Installing backend dependencies...${NC}"
    (cd "$BACKEND_DIR" && npm install)
else
    echo -e "${GREEN}✅ Backend dependencies already installed.${NC}"
fi

# Install Frontend Deps
if [ ! -d "node_modules" ]; then
    echo -e "${CYAN}📥 Installing frontend dependencies...${NC}"
    npm install
else
    echo -e "${GREEN}✅ Frontend dependencies already installed.${NC}"
fi

# --- 3. Execution ---
echo -e "\n${BOLD}⚡ Phase 3: Launching Services${NC}"

# Start Backend
echo -e "${BLUE}📡 Starting Backend Server...${NC}"
cd "$BACKEND_DIR" || exit
npm run dev > /dev/null 2>&1 &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to initialize
sleep 2

# Start Frontend
echo -e "${BLUE}💻 Starting Frontend Client...${NC}"
echo -e "${GREEN}👉 App will be available at: ${BOLD}http://localhost:$FRONTEND_PORT${NC}"
echo -e "${CYAN}💡 Press Ctrl+C to stop all services${NC}"
echo -e "${BLUE}----------------------------------------------------${NC}"

npm run dev

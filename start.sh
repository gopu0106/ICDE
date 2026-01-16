#!/bin/bash

# CampusSync Local Development Startup Script

echo "🚀 Starting CampusSync..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if PostgreSQL is running
echo -e "${YELLOW}Checking PostgreSQL...${NC}"
if ! pg_isready -q 2>/dev/null; then
    echo -e "${RED}❌ PostgreSQL is not running.${NC}"
    echo "Please start PostgreSQL or use Docker:"
    echo "  docker-compose up -d postgres redis"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL is running${NC}"

# Check if Redis is running
echo -e "${YELLOW}Checking Redis...${NC}"
if ! redis-cli ping > /dev/null 2>&1; then
    echo -e "${RED}❌ Redis is not running.${NC}"
    echo "Please start Redis or use Docker:"
    echo "  docker-compose up -d postgres redis"
    exit 1
fi
echo -e "${GREEN}✅ Redis is running${NC}"

# Check if .env files exist
if [ ! -f backend/.env ]; then
    echo -e "${YELLOW}Creating backend/.env from .env.example...${NC}"
    if [ -f backend/.env.example ]; then
        cp backend/.env.example backend/.env
        echo -e "${GREEN}✅ Created backend/.env${NC}"
        echo -e "${YELLOW}⚠️  Please update backend/.env with your database credentials${NC}"
    else
        echo -e "${RED}❌ backend/.env.example not found${NC}"
    fi
fi

# Install backend dependencies
if [ ! -d backend/node_modules ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd backend && npm install && cd ..
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
fi

# Install frontend dependencies
if [ ! -d frontend/node_modules ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
fi

# Check if database exists and run schema
echo -e "${YELLOW}Setting up database...${NC}"
DB_NAME=$(grep DB_NAME backend/.env 2>/dev/null | cut -d '=' -f2 | tr -d ' ')
if [ -z "$DB_NAME" ]; then
    DB_NAME="campussync"
fi

# Try to connect and run schema
if psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${GREEN}✅ Database '$DB_NAME' exists${NC}"
else
    echo -e "${YELLOW}Creating database '$DB_NAME'...${NC}"
    createdb "$DB_NAME" 2>/dev/null || echo -e "${YELLOW}⚠️  Could not create database. Please create it manually.${NC}"
fi

# Run database schema
if [ -f database/schema.sql ]; then
    echo -e "${YELLOW}Running database schema...${NC}"
    psql "$DB_NAME" -f database/schema.sql > /dev/null 2>&1 && \
        echo -e "${GREEN}✅ Database schema loaded${NC}" || \
        echo -e "${YELLOW}⚠️  Could not run schema. You may need to run it manually.${NC}"
fi

# Start backend in background
echo -e "${YELLOW}Starting backend server...${NC}"
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..
echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
echo "   Logs: tail -f backend.log"

# Wait a bit for backend to start
sleep 3

# Start frontend
echo -e "${YELLOW}Starting frontend server...${NC}"
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
echo "   Logs: tail -f frontend.log"

echo ""
echo -e "${GREEN}🎉 CampusSync is running!${NC}"
echo ""
echo "📱 Frontend: http://localhost:3001"
echo "🔧 Backend API: http://localhost:3000/api/v1"
echo "🏥 Health Check: http://localhost:3000/health"
echo ""
echo "To stop servers, run:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "Or use: ./stop.sh"




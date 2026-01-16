#!/bin/bash

# CampusSync Local Development Runner
# This script helps you start the project locally

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 CampusSync Local Setup${NC}"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# Check PostgreSQL
POSTGRES_AVAILABLE=false
if command -v psql &> /dev/null; then
    if psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw postgres; then
        POSTGRES_AVAILABLE=true
        echo -e "${GREEN}✅ PostgreSQL is available${NC}"
    fi
fi

# Check Redis
REDIS_AVAILABLE=false
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        REDIS_AVAILABLE=true
        echo -e "${GREEN}✅ Redis is available${NC}"
    fi
fi

# Check Docker
DOCKER_AVAILABLE=false
if command -v docker &> /dev/null; then
    if docker ps &> /dev/null; then
        DOCKER_AVAILABLE=true
        echo -e "${GREEN}✅ Docker is available${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}📋 Setup Status:${NC}"

if [ "$POSTGRES_AVAILABLE" = true ] && [ "$REDIS_AVAILABLE" = true ]; then
    echo -e "${GREEN}✅ All services available - Ready to start!${NC}"
    USE_DOCKER=false
elif [ "$DOCKER_AVAILABLE" = true ]; then
    echo -e "${YELLOW}⚠️  PostgreSQL/Redis not found, but Docker is available${NC}"
    echo -e "${BLUE}   Will use Docker for database services${NC}"
    USE_DOCKER=true
else
    echo -e "${RED}❌ PostgreSQL and Redis are not available${NC}"
    echo ""
    echo "Please install one of the following:"
    echo "  1. PostgreSQL + Redis (recommended for development)"
    echo "  2. Docker (to run PostgreSQL + Redis in containers)"
    echo ""
    echo "See SETUP.md for installation instructions"
    exit 1
fi

# Setup environment files
if [ ! -f backend/.env ]; then
    echo -e "${YELLOW}Creating backend/.env...${NC}"
    cat > backend/.env << 'EOF'
NODE_ENV=development
PORT=3000
API_VERSION=v1

DATABASE_URL=postgresql://localhost:5432/campussync
DB_HOST=localhost
DB_PORT=5432
DB_NAME=campussync
DB_USER=${USER}
DB_PASSWORD=

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

JWT_SECRET=dev-secret-key-change-in-production-min-32-chars-long
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=dev-refresh-secret-key-change-in-production-min-32-chars
JWT_REFRESH_EXPIRES_IN=7d

QR_EXPIRY_SECONDS=300
QR_SECRET_KEY=dev-qr-secret-key-change-in-production

ENCRYPTION_KEY=dev-encryption-key-32-chars-long

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

LOG_LEVEL=info
LOG_FILE=logs/app.log

CORS_ORIGIN=http://localhost:3001

BCRYPT_ROUNDS=12
SESSION_SECRET=dev-session-secret-change-in-production
EOF
    echo -e "${GREEN}✅ Created backend/.env${NC}"
fi

if [ ! -f frontend/.env.local ]; then
    echo -e "${YELLOW}Creating frontend/.env.local...${NC}"
    echo "NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1" > frontend/.env.local
    echo -e "${GREEN}✅ Created frontend/.env.local${NC}"
fi

# Start Docker services if needed
if [ "$USE_DOCKER" = true ]; then
    echo ""
    echo -e "${YELLOW}Starting Docker services...${NC}"
    docker-compose up -d postgres redis
    echo -e "${GREEN}✅ Docker services started${NC}"
    
    # Wait for services to be ready
    echo -e "${YELLOW}Waiting for services to be ready...${NC}"
    sleep 5
    
    # Update .env for Docker
    sed -i.bak 's/DB_USER=.*/DB_USER=campussync_user/' backend/.env
    sed -i.bak 's/DB_PASSWORD=.*/DB_PASSWORD=changeme/' backend/.env
    sed -i.bak 's/REDIS_PASSWORD=.*/REDIS_PASSWORD=changeme/' backend/.env
fi

# Setup database
echo ""
echo -e "${YELLOW}Setting up database...${NC}"

if [ "$USE_DOCKER" = true ]; then
    # Run schema via Docker
    docker exec -i campussync-postgres psql -U campussync_user -d campussync < database/schema.sql 2>/dev/null || \
    docker exec -i campussync-postgres psql -U campussync_user -d campussync -f /docker-entrypoint-initdb.d/01-schema.sql 2>/dev/null || \
    echo -e "${YELLOW}⚠️  Schema may already be loaded${NC}"
else
    # Create database if it doesn't exist
    createdb campussync 2>/dev/null || echo -e "${YELLOW}⚠️  Database may already exist${NC}"
    
    # Run schema
    psql campussync -f database/schema.sql > /dev/null 2>&1 && \
        echo -e "${GREEN}✅ Database schema loaded${NC}" || \
        echo -e "${YELLOW}⚠️  Schema may already be loaded${NC}"
fi

# Create logs directory
mkdir -p backend/logs

echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo -e "${BLUE}Starting servers...${NC}"
echo ""

# Start backend
echo -e "${YELLOW}📡 Starting backend server...${NC}"
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend
echo -e "${YELLOW}🎨 Starting frontend server...${NC}"
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo ""
echo -e "${GREEN}✅ Servers started!${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 CampusSync is running!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "📱 ${BLUE}Frontend:${NC}  http://localhost:3001"
echo -e "🔧 ${BLUE}Backend API:${NC}  http://localhost:3000/api/v1"
echo -e "🏥 ${BLUE}Health Check:${NC} http://localhost:3000/health"
echo ""
echo -e "${YELLOW}View logs:${NC}"
echo "  Backend:  tail -f backend.log"
echo "  Frontend: tail -f frontend.log"
echo ""
echo -e "${YELLOW}To stop servers:${NC}"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo "  Or run: ./stop.sh"
echo ""




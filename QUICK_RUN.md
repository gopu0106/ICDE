# Quick Run Guide

## 🚀 Fastest Way to Start

### If you have Docker installed:

```bash
./run-local.sh
```

This script will:
1. Check for required services
2. Start PostgreSQL and Redis in Docker if needed
3. Set up the database
4. Start both backend and frontend servers

### Manual Start (if you have PostgreSQL & Redis installed):

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## 📍 Access Points

Once running:
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000/api/v1
- **Health Check**: http://localhost:3000/health

## 🛑 Stop Servers

```bash
./stop.sh
```

Or manually:
```bash
pkill -f "tsx watch src/server.ts"
pkill -f "next dev"
```

## ⚠️ If Services Are Missing

### Option 1: Install PostgreSQL & Redis

**macOS:**
```bash
brew install postgresql@14 redis
brew services start postgresql@14
brew services start redis
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib redis-server
sudo systemctl start postgresql
sudo systemctl start redis
```

### Option 2: Use Docker

```bash
# Install Docker Desktop from https://www.docker.com/products/docker-desktop

# Then run:
docker-compose up -d postgres redis
```

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Kill processes on ports 3000 and 3001
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### Database Connection Error
1. Check PostgreSQL is running: `pg_isready`
2. Update `backend/.env` with correct credentials
3. Create database: `createdb campussync`
4. Load schema: `psql campussync -f database/schema.sql`

### Redis Connection Error
1. Check Redis is running: `redis-cli ping`
2. Should return `PONG`
3. Update `backend/.env` if Redis has a password

## 📝 First Time Setup

1. Run `./run-local.sh` (it will set up everything)
2. Open http://localhost:3001
3. Register a new student account
4. Start using the app!

For detailed setup instructions, see `SETUP.md`




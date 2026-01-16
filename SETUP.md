# CampusSync Local Setup Guide

## Quick Start (Recommended)

### Option 1: Using Docker (Easiest)

If you have Docker installed:

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Run database schema
docker exec -i campussync-postgres psql -U campussync_user -d campussync < database/schema.sql

# Start backend (in one terminal)
cd backend && npm run dev

# Start frontend (in another terminal)
cd frontend && npm run dev
```

### Option 2: Manual Setup

#### 1. Install PostgreSQL

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download from https://www.postgresql.org/download/windows/

#### 2. Install Redis

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

**Windows:**
Download from https://redis.io/download

#### 3. Create Database

```bash
createdb campussync
psql campussync -f database/schema.sql
```

#### 4. Install Node.js Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

#### 5. Configure Environment Variables

**Backend** (`backend/.env`):
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=campussync
DB_USER=your_username
DB_PASSWORD=your_password
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

#### 6. Start Servers

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

## Access the Application

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000/api/v1
- **Health Check**: http://localhost:3000/health

## Troubleshooting

### PostgreSQL Connection Issues

1. Check if PostgreSQL is running:
   ```bash
   pg_isready
   ```

2. Check your username:
   ```bash
   whoami
   ```
   Update `DB_USER` in `backend/.env` to match.

3. If using password authentication, ensure `DB_PASSWORD` is set.

### Redis Connection Issues

1. Check if Redis is running:
   ```bash
   redis-cli ping
   ```
   Should return `PONG`.

2. If Redis requires a password, set `REDIS_PASSWORD` in `backend/.env`.

### Port Already in Use

If ports 3000 or 3001 are in use:

1. Kill existing processes:
   ```bash
   lsof -ti:3000 | xargs kill
   lsof -ti:3001 | xargs kill
   ```

2. Or change ports in:
   - Backend: `backend/.env` (PORT)
   - Frontend: `frontend/next.config.js` (port in dev script)

## Next Steps

1. Create a test user:
   - Visit http://localhost:3001/student/register
   - Or use the API to create users

2. Test the flow:
   - Register/Login
   - Add wallet balance
   - Test QR scanning (requires camera permissions)




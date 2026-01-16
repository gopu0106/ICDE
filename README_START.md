# 🚀 Quick Start - Run CampusSync Locally

## Fastest Way (Recommended)

Just run:
```bash
./run-local.sh
```

This will:
- ✅ Check for required services (PostgreSQL, Redis)
- ✅ Start Docker containers if needed
- ✅ Set up the database
- ✅ Start backend and frontend servers

Then open: **http://localhost:3001**

## What You Need

### Option 1: Docker (Easiest)
Install Docker Desktop: https://www.docker.com/products/docker-desktop

### Option 2: Local Services
- PostgreSQL 14+
- Redis 6+
- Node.js 18+

See `SETUP.md` for installation instructions.

## Manual Start

If you prefer to start manually:

**Terminal 1:**
```bash
cd backend
npm run dev
```

**Terminal 2:**
```bash
cd frontend
npm run dev
```

## Access

- Frontend: http://localhost:3001
- Backend: http://localhost:3000/api/v1
- Health: http://localhost:3000/health

## Stop Servers

```bash
./stop.sh
```

## Need Help?

- See `SETUP.md` for detailed setup
- See `QUICK_RUN.md` for troubleshooting
- Check logs: `tail -f backend.log` or `tail -f frontend.log`

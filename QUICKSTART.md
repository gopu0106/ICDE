# CampusSync Quick Start Guide

## Overview

CampusSync is a production-ready campus dining ecosystem with a unified e-wallet system. This guide will help you get started quickly.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+
- Git

## Quick Start (Development)

### 1. Clone and Setup

```bash
# Clone repository
git clone <repository-url>
cd CampusSync

# Setup backend
cd backend
npm install
cp .env.example .env
# Edit .env with your database and Redis credentials

# Setup frontend
cd ../frontend
npm install
```

### 2. Database Setup

```bash
# Create database
createdb campussync

# Run schema
psql -d campussync -f ../database/schema.sql
```

### 3. Start Services

```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start Backend
cd backend
npm run dev

# Terminal 3: Start Frontend
cd frontend
npm run dev
```

### 4. Access Application

- Frontend: http://localhost:3001
- Backend API: http://localhost:3000/api/v1
- Health Check: http://localhost:3000/health

## Quick Start (Docker)

### 1. Setup Environment

```bash
# Create .env file
cat > .env << EOF
DB_PASSWORD=secure_password
REDIS_PASSWORD=secure_redis_password
JWT_SECRET=your-32-character-secret-key
JWT_REFRESH_SECRET=your-32-character-refresh-secret
QR_SECRET_KEY=your-qr-secret-key
ENCRYPTION_KEY=your-32-character-encryption-key
CORS_ORIGIN=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
EOF
```

### 2. Start Services

```bash
docker-compose up -d
```

### 3. Check Logs

```bash
docker-compose logs -f
```

## Initial Setup

### 1. Create Admin User

```bash
# Using API
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@university.edu",
    "password": "securepassword123",
    "fullName": "Admin User",
    "role": "admin"
  }'
```

### 2. Create Test Student

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "STU001",
    "email": "student@university.edu",
    "password": "securepassword123",
    "fullName": "Test Student",
    "role": "student"
  }'
```

### 3. Create Test Vendor

```bash
# First create vendor user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "vendor@university.edu",
    "password": "securepassword123",
    "fullName": "Test Vendor",
    "role": "vendor"
  }'

# Then create vendor record (requires admin access)
# Use admin token to create vendor via database or admin API
```

### 4. Fund Student Wallet

```bash
# Login as student
TOKEN=$(curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@university.edu",
    "password": "securepassword123"
  }' | jq -r '.accessToken')

# Pay mess fee
curl -X POST http://localhost:3000/api/v1/wallet/mess-fee \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "academicYear": "2024-2025"
  }'
```

## Testing the Flow

### 1. Student Generates QR

```bash
# Get student QR
curl -X GET http://localhost:3000/api/v1/qr/student \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Process Meal Transaction

```bash
# Vendor processes meal (requires vendor token and menu item)
curl -X POST http://localhost:3000/api/v1/meals/process \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentQR": "<qr_code_from_step_1>",
    "vendorId": "<vendor_id>",
    "menuItemId": "<menu_item_id>",
    "amount": 50
  }'
```

### 3. Check Wallet Balance

```bash
curl -X GET http://localhost:3000/api/v1/wallet/balance \
  -H "Authorization: Bearer $TOKEN"
```

## Project Structure

```
CampusSync/
├── backend/              # Node.js + Express backend
│   ├── src/
│   │   ├── config/      # Database, logger config
│   │   ├── middleware/ # Auth, validation, rate limiting
│   │   ├── routes/     # API routes
│   │   ├── services/   # Business logic
│   │   └── server.ts   # Entry point
│   └── package.json
├── frontend/            # Next.js frontend
│   ├── src/
│   │   ├── lib/        # API client
│   │   └── ...
│   └── package.json
├── database/            # Database schema
│   └── schema.sql
├── docs/                # Documentation
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── SECURITY.md
│   └── DEPLOYMENT.md
└── docker-compose.yml   # Docker setup
```

## Key Features

1. **Consumption-Based Billing**: Students only pay for meals consumed
2. **QR Code Payments**: Secure, time-bound QR codes
3. **Double-Entry Accounting**: Immutable transaction ledger
4. **Vendor Settlements**: Automated periodic payments
5. **Analytics Dashboard**: Comprehensive reporting

## Next Steps

1. Read [API Documentation](docs/API.md) for complete API reference
2. Review [Architecture](docs/ARCHITECTURE.md) for system design
3. Check [Security Checklist](docs/SECURITY.md) before production
4. Follow [Deployment Guide](docs/DEPLOYMENT.md) for production setup

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Check connection
psql -U campussync_user -d campussync -c "SELECT 1"
```

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping

# With password
redis-cli -a your_password ping
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3000
lsof -i :3001

# Kill process
kill -9 <PID>
```

## Support

For issues and questions:
- Check documentation in `docs/` folder
- Review error logs in `backend/logs/`
- Check API health: http://localhost:3000/health


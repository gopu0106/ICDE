# CampusSync Deployment Guide

## Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL 14+
- Redis 6+
- PM2 (for process management) or Docker

## Local Development Setup

### 1. Database Setup

```bash
# Create database
createdb campussync

# Run migrations
psql -d campussync -f database/schema.sql

# Or use migration tool
cd backend
npm run migrate:up
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# - Database connection
# - Redis connection
# - JWT secrets
# - Encryption keys

# Start development server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file (if needed)
# Create .env.local with NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1

# Start development server
npm run dev
```

## Production Deployment

### Option 1: Traditional Server Deployment

#### 1. Server Requirements

- Ubuntu 20.04+ or similar Linux distribution
- 4+ CPU cores
- 8GB+ RAM
- 100GB+ storage
- PostgreSQL and Redis installed

#### 2. Database Setup

```bash
# Install PostgreSQL
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE campussync;
CREATE USER campussync_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE campussync TO campussync_user;
\q

# Run schema
psql -U campussync_user -d campussync -f database/schema.sql
```

#### 3. Redis Setup

```bash
# Install Redis
sudo apt-get install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: requirepass your_redis_password
# Set: bind 127.0.0.1

# Restart Redis
sudo systemctl restart redis
```

#### 4. Backend Deployment

```bash
# Clone repository
git clone <repository-url>
cd CampusSync/backend

# Install dependencies
npm install --production

# Build TypeScript
npm run build

# Set up environment
cp .env.example .env
nano .env  # Configure all values

# Install PM2
sudo npm install -g pm2

# Start application
pm2 start dist/server.js --name campussync-backend

# Save PM2 configuration
pm2 save
pm2 startup
```

#### 5. Frontend Deployment

```bash
cd ../frontend

# Install dependencies
npm install

# Build for production
npm run build

# Start with PM2
pm2 start npm --name campussync-frontend -- start

# Or use Next.js standalone
npm run build
pm2 start node_modules/.bin/next --name campussync-frontend -- start
```

#### 6. Nginx Configuration

```nginx
# /etc/nginx/sites-available/campussync

# Backend API
server {
    listen 80;
    server_name api.campussync.edu;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Frontend
server {
    listen 80;
    server_name campussync.edu;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/campussync /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 7. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d campussync.edu -d api.campussync.edu

# Auto-renewal
sudo certbot renew --dry-run
```

### Option 2: Docker Deployment

#### 1. Docker Compose Setup

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: campussync
      POSTGRES_USER: campussync_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "5432:5432"

  redis:
    image: redis:6-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://campussync_user:${DB_PASSWORD}@postgres:5432/campussync
      REDIS_HOST: redis
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: http://api.campussync.edu/api/v1
    ports:
      - "3001:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
```

#### 2. Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

#### 3. Frontend Dockerfile

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["npm", "start"]
```

#### 4. Deploy with Docker

```bash
# Create .env file with all secrets
cp .env.example .env
nano .env

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Environment Variables

### Backend (.env)

```bash
NODE_ENV=production
PORT=3000
API_VERSION=v1

DATABASE_URL=postgresql://user:password@localhost:5432/campussync
DB_HOST=localhost
DB_PORT=5432
DB_NAME=campussync
DB_USER=user
DB_PASSWORD=secure_password

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=secure_redis_password

JWT_SECRET=your-32-character-secret-key-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-32-character-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

QR_EXPIRY_SECONDS=300
QR_SECRET_KEY=your-qr-secret-key

ENCRYPTION_KEY=your-32-character-encryption-key

CORS_ORIGIN=https://campussync.edu
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=https://api.campussync.edu/api/v1
```

## Monitoring & Maintenance

### Health Checks

```bash
# Backend health
curl http://localhost:3000/health

# Database connection
psql -U campussync_user -d campussync -c "SELECT 1"

# Redis connection
redis-cli -a your_password ping
```

### Logs

```bash
# PM2 logs
pm2 logs campussync-backend
pm2 logs campussync-frontend

# Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Application logs
tail -f backend/logs/combined.log
tail -f backend/logs/error.log
```

### Database Backups

```bash
# Create backup
pg_dump -U campussync_user campussync > backup_$(date +%Y%m%d).sql

# Restore backup
psql -U campussync_user campussync < backup_20240115.sql
```

### Updates

```bash
# Pull latest code
git pull origin main

# Backend update
cd backend
npm install --production
npm run build
pm2 restart campussync-backend

# Frontend update
cd frontend
npm install
npm run build
pm2 restart campussync-frontend
```

## Scaling

### Horizontal Scaling

1. **Load Balancer**: Set up Nginx or AWS ALB
2. **Multiple Backend Instances**: Run multiple backend instances
3. **Database Replication**: Set up PostgreSQL read replicas
4. **Redis Cluster**: Use Redis cluster for high availability

### Vertical Scaling

1. **Increase Server Resources**: More CPU/RAM
2. **Database Optimization**: Tune PostgreSQL settings
3. **Connection Pooling**: Adjust pool sizes
4. **Caching**: Increase Redis memory

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check PostgreSQL is running
   - Verify connection string
   - Check firewall rules

2. **Redis Connection Errors**
   - Check Redis is running
   - Verify password
   - Check network connectivity

3. **High Memory Usage**
   - Check for memory leaks
   - Increase server RAM
   - Optimize queries

4. **Slow Performance**
   - Check database indexes
   - Review slow queries
   - Increase connection pool size
   - Add Redis caching

## Security Checklist

See `docs/SECURITY.md` for complete security checklist.

Before production deployment:
- [ ] Change all default secrets
- [ ] Enable HTTPS
- [ ] Configure firewall rules
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Review security checklist




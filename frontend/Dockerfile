FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tailwind.config.js ./
COPY next.config.js* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY public/ ./public/ 2>/dev/null || true

# Build Next.js application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public 2>/dev/null || true

# Expose port
EXPOSE 3000

# Start Next.js
CMD ["npm", "start"]




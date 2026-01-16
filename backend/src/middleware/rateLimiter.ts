import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { getRedisClient } from '../config/database';
import { logger } from '../config/logger';

// Standard rate limiter
export const standardLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// QR scan rate limiter (prevent rapid scans)
export const qrScanLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 scans per minute
  message: 'Too many QR scan attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Rate limit by user ID if authenticated, otherwise by IP
    return (req as any).user?.id || req.ip || 'unknown';
  },
});

// Transaction rate limiter (prevent double-spending)
export const transactionLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 1, // 1 transaction per 10 seconds per user
  message: 'Transaction rate limit exceeded. Please wait before next transaction.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req as any).user?.id || req.ip || 'unknown';
  },
});




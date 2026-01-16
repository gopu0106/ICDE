import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';
import { logger } from '../config/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    studentId?: string;
    email: string;
    role: string;
  };
}

// JWT Secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  studentId?: string;
}

// Generate Access Token
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
}

// Generate Refresh Token
export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
}

// Verify Access Token
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Verify Refresh Token
export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Authentication Middleware
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Verify token hasn't been revoked (check in database)
    const sessionCheck = await pool.query(
      'SELECT is_revoked FROM sessions WHERE user_id = $1 AND refresh_token LIKE $2 AND is_revoked = false',
      [payload.id, `%${token.substring(0, 20)}%`]
    );

    // Set user in request
    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      studentId: payload.studentId,
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

// Role-based Authorization Middleware
export function authorize(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Normalize roles to uppercase for comparison
    const userRole = req.user.role.toUpperCase();
    const normalizedAllowedRoles = allowedRoles.map(role => role.toUpperCase());

    if (!normalizedAllowedRoles.includes(userRole)) {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      return;
    }

    next();
  };
}

// Student-only middleware
export const requireStudent = [authenticate, authorize('student')];

// Vendor-only middleware
export const requireVendor = [authenticate, authorize('vendor')];

// Admin-only middleware (accepts both lowercase and uppercase, normalized in authorize)
export const requireAdmin = [authenticate, authorize('admin', 'ADMIN', 'super_admin', 'SUPER_ADMIN')];



import express, { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../middleware/auth';
import { authLimiter, standardLimiter } from '../middleware/rateLimiter';
import { validate, schemas } from '../middleware/validation';
import { z } from 'zod';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Register schema
const registerSchema = z.object({
  body: z.object({
    studentId: z.string().min(1).max(50).optional(),
    email: schemas.email,
    password: schemas.password,
    fullName: z.string().min(1).max(255),
    phone: schemas.phone.optional(),
    role: z.enum(['student', 'vendor', 'admin']).default('student'),
  }),
});

// Login schema
const loginSchema = z.object({
  body: z.object({
    email: schemas.email,
    password: z.string().min(1),
  }),
});

// Refresh token schema
const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  async (req, res) => {
    try {
      const { studentId, email, password, fullName, phone, role } = req.body;

      // Check if user exists
      const existingUser = await pool.query('SELECT id FROM users WHERE email = $1 OR student_id = $2', [
        email,
        studentId,
      ]);

      if (existingUser.rows.length > 0) {
        res.status(409).json({ error: 'User already exists' });
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));

      // Create user
      const result = await pool.query(
        `INSERT INTO users (student_id, email, password_hash, full_name, phone, role)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, student_id, email, full_name, role`,
        [studentId || null, email, passwordHash, fullName, phone || null, role]
      );

      const user = result.rows[0];

      // Normalize role to uppercase for consistency
      const normalizedRole = user.role.toUpperCase();

      // Generate tokens
      const accessToken = generateAccessToken({
        id: user.id,
        email: user.email,
        role: normalizedRole,
        studentId: user.student_id,
      });

      const refreshToken = generateRefreshToken({
        id: user.id,
        email: user.email,
        role: normalizedRole,
        studentId: user.student_id,
      });

      // Store refresh token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      await pool.query(
        `INSERT INTO sessions (user_id, refresh_token, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, refreshToken, expiresAt, req.ip, req.get('user-agent')]
      );

      res.status(201).json({
        user: {
          id: user.id,
          studentId: user.student_id,
          email: user.email,
          fullName: user.full_name,
          role: normalizedRole,
        },
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      logger.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email]
      );

      if (result.rows.length === 0) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const user = result.rows[0];

      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash);

      if (!isValid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Normalize role to uppercase for consistency
      const normalizedRole = user.role.toUpperCase();

      // Generate tokens
      const accessToken = generateAccessToken({
        id: user.id,
        email: user.email,
        role: normalizedRole,
        studentId: user.student_id,
      });

      const refreshToken = generateRefreshToken({
        id: user.id,
        email: user.email,
        role: normalizedRole,
        studentId: user.student_id,
      });

      // Store refresh token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await pool.query(
        `INSERT INTO sessions (user_id, refresh_token, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, refreshToken, expiresAt, req.ip, req.get('user-agent')]
      );

      res.json({
        user: {
          id: user.id,
          studentId: user.student_id,
          email: user.email,
          fullName: user.full_name,
          role: normalizedRole,
        },
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  standardLimiter,
  validate(refreshTokenSchema),
  async (req, res) => {
    try {
      const { refreshToken } = req.body;

      // Verify refresh token
      const payload = verifyRefreshToken(refreshToken);

      if (!payload) {
        res.status(401).json({ error: 'Invalid refresh token' });
        return;
      }

      // Check if token exists and is not revoked
      const sessionResult = await pool.query(
        'SELECT * FROM sessions WHERE refresh_token = $1 AND is_revoked = false AND expires_at > CURRENT_TIMESTAMP',
        [refreshToken]
      );

      if (sessionResult.rows.length === 0) {
        res.status(401).json({ error: 'Refresh token expired or revoked' });
        return;
      }

      // Normalize role to uppercase (should already be uppercase, but ensure consistency)
      const normalizedRole = payload.role.toUpperCase();

      // Generate new access token
      const accessToken = generateAccessToken({
        id: payload.id,
        email: payload.email,
        role: normalizedRole,
        studentId: payload.studentId,
      });

      res.json({ accessToken });
    } catch (error: any) {
      logger.error('Token refresh error:', error);
      res.status(500).json({ error: 'Token refresh failed' });
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout user (revoke refresh token)
 */
router.post(
  '/logout',
  standardLimiter,
  validate(refreshTokenSchema),
  async (req, res) => {
    try {
      const { refreshToken } = req.body;

      await pool.query(
        'UPDATE sessions SET is_revoked = true WHERE refresh_token = $1',
        [refreshToken]
      );

      res.json({ message: 'Logged out successfully' });
    } catch (error: any) {
      logger.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }
);

export default router;



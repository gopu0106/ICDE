import express, { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { walletService } from '../services/wallet.service';
import { validate, schemas } from '../middleware/validation';
import { z } from 'zod';
import { standardLimiter, transactionLimiter } from '../middleware/rateLimiter';
import { pool } from '../config/database';
import { logger } from '../config/logger';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get wallet balance schema
const getBalanceSchema = z.object({
  params: z.object({
    userId: schemas.uuid.optional(),
  }),
});

// Top-up schema
const topupSchema = z.object({
  body: z.object({
    amount: schemas.amount,
    paymentMethod: z.string().optional(),
    paymentReference: z.string().optional(),
  }),
});

// Mess fee payment schema
const messFeeSchema = z.object({
  body: z.object({
    amount: schemas.amount,
    academicYear: z.string().min(1),
    semester: z.string().optional(),
  }),
});

/**
 * GET /api/wallet/balance
 * Get wallet balance
 */
router.get(
  '/balance',
  standardLimiter,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const balance = await walletService.getWalletBalance(userId);

      res.json({ balance, currency: 'INR' });
    } catch (error: any) {
      logger.error('Get balance error:', error);
      res.status(500).json({ error: 'Failed to get balance' });
    }
  }
);

/**
 * GET /api/wallet/summary
 * Get wallet summary with statistics
 */
router.get(
  '/summary',
  standardLimiter,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const summary = await walletService.getWalletSummary(userId);

      res.json(summary);
    } catch (error: any) {
      logger.error('Get wallet summary error:', error);
      res.status(500).json({ error: 'Failed to get wallet summary' });
    }
  }
);

/**
 * GET /api/wallet/transactions
 * Get transaction history
 */
router.get(
  '/transactions',
  standardLimiter,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const transactions = await walletService.getTransactionHistory(userId, limit, offset);

      res.json({ transactions, limit, offset });
    } catch (error: any) {
      logger.error('Get transactions error:', error);
      res.status(500).json({ error: 'Failed to get transactions' });
    }
  }
);

/**
 * POST /api/wallet/topup
 * Top up wallet
 */
router.post(
  '/topup',
  transactionLimiter,
  validate(topupSchema),
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { amount, paymentMethod, paymentReference } = req.body;

      // Create top-up record
      const topupResult = await pool.query(
        `INSERT INTO topups (wallet_id, student_id, amount, payment_method, payment_reference, status, created_by)
         SELECT w.id, $1, $2, $3, $4, 'pending', $1
         FROM wallets w WHERE w.user_id = $1
         RETURNING id`,
        [userId, amount, paymentMethod || 'online', paymentReference]
      );

      if (topupResult.rows.length === 0) {
        throw new Error('Wallet not found');
      }

      const topupId = topupResult.rows[0].id;

      // Credit wallet
      const transaction = await walletService.creditWallet(
        userId,
        amount,
        'topup',
        topupId,
        `Wallet top-up: ₹${amount}`,
        { paymentMethod, paymentReference }
      );

      // Update top-up status
      await pool.query(
        'UPDATE topups SET status = $1, processed_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['completed', topupId]
      );

      res.status(201).json({
        message: 'Wallet topped up successfully',
        transaction,
        topupId,
      });
    } catch (error: any) {
      logger.error('Top-up error:', error);
      res.status(500).json({ error: error.message || 'Top-up failed' });
    }
  }
);

/**
 * POST /api/wallet/mess-fee
 * Pay mess fee (initial wallet funding)
 */
router.post(
  '/mess-fee',
  transactionLimiter,
  validate(messFeeSchema),
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { amount, academicYear, semester } = req.body;

      // Check if mess fee already paid for this academic year
      const existingResult = await pool.query(
        'SELECT * FROM mess_fees WHERE student_id = $1 AND academic_year = $2',
        [userId, academicYear]
      );

      if (existingResult.rows.length > 0) {
        res.status(409).json({ error: 'Mess fee already paid for this academic year' });
        return;
      }

      // Create mess fee record
      const wallet = await walletService.getOrCreateWallet(userId);

      const messFeeResult = await pool.query(
        `INSERT INTO mess_fees (student_id, wallet_id, academic_year, semester, amount, payment_status)
         VALUES ($1, $2, $3, $4, $5, 'paid')
         RETURNING id`,
        [userId, wallet.id, academicYear, semester || null, amount]
      );

      const messFeeId = messFeeResult.rows[0].id;

      // Credit wallet
      const transaction = await walletService.creditWallet(
        userId,
        amount,
        'mess_fee',
        messFeeId,
        `Mess fee payment for ${academicYear}`,
        { academicYear, semester }
      );

      res.status(201).json({
        message: 'Mess fee paid successfully',
        transaction,
        messFeeId,
      });
    } catch (error: any) {
      logger.error('Mess fee payment error:', error);
      res.status(500).json({ error: error.message || 'Mess fee payment failed' });
    }
  }
);

export default router;




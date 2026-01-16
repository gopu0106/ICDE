import express, { Router } from 'express';
import { authenticate, AuthRequest, requireStudent, requireVendor } from '../middleware/auth';
import { mealService } from '../services/meal.service';
import { validate, schemas } from '../middleware/validation';
import { z } from 'zod';
import { qrScanLimiter, transactionLimiter } from '../middleware/rateLimiter';
import { logger } from '../config/logger';

const router = Router();

// Process meal schema (vendor scans student QR)
const processMealStudentQRSchema = z.object({
  body: z.object({
    studentQR: z.string().min(1),
    vendorId: schemas.uuid,
    menuItemId: schemas.uuid,
    amount: schemas.amount.optional(),
  }),
});

// Process meal schema (student scans counter QR)
const processMealCounterQRSchema = z.object({
  body: z.object({
    counterQR: z.string().min(1),
    vendorId: schemas.uuid,
    menuItemId: schemas.uuid,
    amount: schemas.amount.optional(),
  }),
});

// Get meal history schema
const getMealHistorySchema = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).optional(),
    offset: z.string().regex(/^\d+$/).optional(),
  }),
});

/**
 * POST /api/meals/process
 * Process meal transaction (consumption-based billing)
 * Vendor endpoint: scans student QR
 */
router.post(
  '/process',
  requireVendor,
  qrScanLimiter,
  transactionLimiter,
  validate(processMealStudentQRSchema),
  async (req: AuthRequest, res) => {
    try {
      const { studentQR, vendorId, menuItemId, amount } = req.body;

      // Verify vendor owns this vendorId
      // (In production, get vendor from authenticated user)
      const transaction = await mealService.processMealTransaction({
        studentQR,
        vendorId,
        menuItemId,
        amount,
      });

      res.status(201).json({
        message: 'Meal transaction processed successfully',
        transaction,
      });
    } catch (error: any) {
      logger.error('Process meal error:', error);
      res.status(400).json({ error: error.message || 'Failed to process meal transaction' });
    }
  }
);

/**
 * POST /api/meals/process-scan
 * Process meal transaction (student scans counter QR)
 * Student endpoint: scans counter QR from their app
 */
router.post(
  '/process-scan',
  requireStudent,
  qrScanLimiter,
  transactionLimiter,
  validate(processMealCounterQRSchema),
  async (req: AuthRequest, res) => {
    try {
      const { counterQR, vendorId, menuItemId, amount } = req.body;
      const studentId = req.user!.id;

      const transaction = await mealService.processMealTransaction({
        counterQR,
        vendorId,
        menuItemId,
        amount,
        studentId,
      });

      res.status(201).json({
        message: 'Meal transaction processed successfully',
        transaction,
      });
    } catch (error: any) {
      logger.error('Process meal scan error:', error);
      res.status(400).json({ error: error.message || 'Failed to process meal transaction' });
    }
  }
);

/**
 * GET /api/meals/history
 * Get student meal history
 */
router.get(
  '/history',
  requireStudent,
  validate(getMealHistorySchema),
  async (req: AuthRequest, res) => {
    try {
      const studentId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const transactions = await mealService.getStudentMealHistory(studentId, limit, offset);

      res.json({ transactions, limit, offset });
    } catch (error: any) {
      logger.error('Get meal history error:', error);
      res.status(500).json({ error: 'Failed to get meal history' });
    }
  }
);

/**
 * GET /api/meals/vendor/:vendorId
 * Get vendor transactions (vendor only)
 */
router.get(
  '/vendor/:vendorId',
  requireVendor,
  async (req: AuthRequest, res) => {
    try {
      const { vendorId } = req.params;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      // TODO: Verify vendor owns this vendorId

      const transactions = await mealService.getVendorTransactions(
        vendorId,
        startDate,
        endDate,
        limit,
        offset
      );

      res.json({ transactions, limit, offset });
    } catch (error: any) {
      logger.error('Get vendor transactions error:', error);
      res.status(500).json({ error: 'Failed to get vendor transactions' });
    }
  }
);

export default router;




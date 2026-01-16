import express, { Router } from 'express';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth';
import { vendorService } from '../services/vendor.service';
import { mealService } from '../services/meal.service';
import { standardLimiter } from '../middleware/rateLimiter';
import { pool } from '../config/database';
import { logger } from '../config/logger';
import { z } from 'zod';
import { validate } from '../middleware/validation';

const router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// Create settlement schema
const createSettlementSchema = z.object({
  body: z.object({
    vendorId: z.string().uuid(),
    periodStart: z.string().transform((str) => new Date(str)),
    periodEnd: z.string().transform((str) => new Date(str)),
    commissionRate: z.number().min(0).max(100).default(0),
  }),
});

/**
 * GET /api/admin/analytics/overview
 * Get system overview analytics
 */
router.get(
  '/analytics/overview',
  standardLimiter,
  async (req: AuthRequest, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      // Get total students
      const studentsResult = await pool.query(
        "SELECT COUNT(*) as count FROM users WHERE role = 'student' AND is_active = true"
      );
      const totalStudents = parseInt(studentsResult.rows[0].count);

      // Get total vendors
      const vendorsResult = await pool.query(
        'SELECT COUNT(*) as count FROM vendors WHERE is_active = true'
      );
      const totalVendors = parseInt(vendorsResult.rows[0].count);

      // Get total wallet balance
      const walletResult = await pool.query(
        'SELECT COALESCE(SUM(balance), 0) as total_balance FROM wallets'
      );
      const totalWalletBalance = parseFloat(walletResult.rows[0].total_balance);

      // Get meal statistics
      const mealStats = await mealService.getMealStatistics(startDate, endDate);

      // Get total revenue
      let revenueQuery = `SELECT COALESCE(SUM(amount), 0) as total_revenue 
                         FROM meal_transactions 
                         WHERE transaction_status = 'completed'`;
      const revenueParams: any[] = [];
      let paramIndex = 1;

      if (startDate) {
        revenueQuery += ` AND created_at >= $${paramIndex++}`;
        revenueParams.push(startDate);
      }
      if (endDate) {
        revenueQuery += ` AND created_at <= $${paramIndex++}`;
        revenueParams.push(endDate);
      }

      const revenueResult = await pool.query(revenueQuery, revenueParams);
      const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue);

      res.json({
        overview: {
          totalStudents,
          totalVendors,
          totalWalletBalance,
          totalRevenue,
        },
        mealStatistics: mealStats,
      });
    } catch (error: any) {
      logger.error('Get analytics overview error:', error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  }
);

/**
 * GET /api/admin/analytics/consumption
 * Get meal consumption trends
 */
router.get(
  '/analytics/consumption',
  standardLimiter,
  async (req: AuthRequest, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const mealType = req.query.mealType as string | undefined;

      const stats = await mealService.getMealStatistics(startDate, endDate, mealType);

      res.json({ consumptionTrends: stats });
    } catch (error: any) {
      logger.error('Get consumption trends error:', error);
      res.status(500).json({ error: 'Failed to get consumption trends' });
    }
  }
);

/**
 * POST /api/admin/settlements/create
 * Create vendor settlement
 */
router.post(
  '/settlements/create',
  standardLimiter,
  validate(createSettlementSchema),
  async (req: AuthRequest, res) => {
    try {
      const { vendorId, periodStart, periodEnd, commissionRate } = req.body;

      const settlement = await vendorService.createSettlement(
        vendorId,
        periodStart,
        periodEnd,
        commissionRate
      );

      res.status(201).json({
        message: 'Settlement created successfully',
        settlement,
      });
    } catch (error: any) {
      logger.error('Create settlement error:', error);
      res.status(400).json({ error: error.message || 'Failed to create settlement' });
    }
  }
);

/**
 * POST /api/admin/settlements/:settlementId/mark-paid
 * Mark settlement as paid
 */
router.post(
  '/settlements/:settlementId/mark-paid',
  standardLimiter,
  async (req: AuthRequest, res) => {
    try {
      const { settlementId } = req.params;
      const { paymentReference } = req.body;
      const adminId = req.user!.id;

      if (!paymentReference) {
        res.status(400).json({ error: 'Payment reference required' });
        return;
      }

      await vendorService.markSettlementPaid(settlementId, paymentReference, adminId);

      res.json({ message: 'Settlement marked as paid' });
    } catch (error: any) {
      logger.error('Mark settlement paid error:', error);
      res.status(500).json({ error: 'Failed to mark settlement as paid' });
    }
  }
);

/**
 * GET /api/admin/audit-logs
 * Get audit logs
 */
router.get(
  '/audit-logs',
  standardLimiter,
  async (req: AuthRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const entityType = req.query.entityType as string | undefined;
      const entityId = req.query.entityId as string | undefined;

      let query = 'SELECT * FROM audit_logs WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (entityType) {
        query += ` AND entity_type = $${paramIndex++}`;
        params.push(entityType);
      }

      if (entityId) {
        query += ` AND entity_id = $${paramIndex++}`;
        params.push(entityId);
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      res.json({
        logs: result.rows,
        limit,
        offset,
      });
    } catch (error: any) {
      logger.error('Get audit logs error:', error);
      res.status(500).json({ error: 'Failed to get audit logs' });
    }
  }
);

export default router;




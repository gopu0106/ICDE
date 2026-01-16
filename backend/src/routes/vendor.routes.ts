import express, { Router } from 'express';
import { authenticate, AuthRequest, requireVendor, requireAdmin } from '../middleware/auth';
import { vendorService } from '../services/vendor.service';
import { menuService } from '../services/menu.service';
import { standardLimiter } from '../middleware/rateLimiter';
import { logger } from '../config/logger';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/vendors/me
 * Get current vendor's information
 */
router.get(
  '/me',
  requireVendor,
  standardLimiter,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const vendor = await vendorService.getVendorByUserId(userId);

      if (!vendor) {
        res.status(404).json({ error: 'Vendor not found' });
        return;
      }

      res.json(vendor);
    } catch (error: any) {
      logger.error('Get vendor error:', error);
      res.status(500).json({ error: 'Failed to get vendor information' });
    }
  }
);

/**
 * GET /api/vendors/:vendorId
 * Get vendor by ID
 */
router.get(
  '/:vendorId',
  standardLimiter,
  async (req: AuthRequest, res) => {
    try {
      const { vendorId } = req.params;
      const vendor = await vendorService.getVendorById(vendorId);

      if (!vendor) {
        res.status(404).json({ error: 'Vendor not found' });
        return;
      }

      res.json(vendor);
    } catch (error: any) {
      logger.error('Get vendor error:', error);
      res.status(500).json({ error: 'Failed to get vendor' });
    }
  }
);

/**
 * GET /api/vendors/:vendorId/performance
 * Get vendor performance metrics
 */
router.get(
  '/:vendorId/performance',
  requireVendor,
  standardLimiter,
  async (req: AuthRequest, res) => {
    try {
      const { vendorId } = req.params;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const performance = await vendorService.getVendorPerformance(vendorId, startDate, endDate);

      res.json(performance);
    } catch (error: any) {
      logger.error('Get vendor performance error:', error);
      res.status(500).json({ error: 'Failed to get vendor performance' });
    }
  }
);

/**
 * GET /api/vendors/:vendorId/menu
 * Get vendor menu items
 */
router.get(
  '/:vendorId/menu',
  standardLimiter,
  async (req: AuthRequest, res) => {
    try {
      const { vendorId } = req.params;
      const isAvailable = req.query.available === 'true' ? true : undefined;

      const menuItems = await menuService.getVendorMenuItems(vendorId, isAvailable);

      res.json({ menuItems });
    } catch (error: any) {
      logger.error('Get vendor menu error:', error);
      res.status(500).json({ error: 'Failed to get vendor menu' });
    }
  }
);

/**
 * GET /api/vendors/:vendorId/settlements
 * Get vendor settlements
 */
router.get(
  '/:vendorId/settlements',
  requireVendor,
  standardLimiter,
  async (req: AuthRequest, res) => {
    try {
      const { vendorId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const settlements = await vendorService.getVendorSettlements(vendorId, limit, offset);

      res.json({ settlements, limit, offset });
    } catch (error: any) {
      logger.error('Get vendor settlements error:', error);
      res.status(500).json({ error: 'Failed to get vendor settlements' });
    }
  }
);

/**
 * GET /api/vendors
 * Get all vendors (admin only)
 */
router.get(
  '/',
  requireAdmin,
  standardLimiter,
  async (req: AuthRequest, res) => {
    try {
      const vendorType = req.query.type as 'mess' | 'canteen' | undefined;
      const isActive = req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined;

      const vendors = await vendorService.getAllVendors(vendorType, isActive);

      res.json({ vendors });
    } catch (error: any) {
      logger.error('Get all vendors error:', error);
      res.status(500).json({ error: 'Failed to get vendors' });
    }
  }
);

export default router;




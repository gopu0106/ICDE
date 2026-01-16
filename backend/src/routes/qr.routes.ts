import express, { Router } from 'express';
import { authenticate, AuthRequest, requireStudent, requireVendor } from '../middleware/auth';
import { qrService } from '../services/qr.service';
import { standardLimiter } from '../middleware/rateLimiter';
import { logger } from '../config/logger';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/qr/student
 * Generate student QR code (for student to show at counter)
 */
router.get(
  '/student',
  requireStudent,
  standardLimiter,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const qr = await qrService.generateStudentQR(userId);

      res.json({
        qrCode: qr.qrCode,
        qrDataUrl: qr.qrDataUrl,
        expiresIn: parseInt(process.env.QR_EXPIRY_SECONDS || '300'),
      });
    } catch (error: any) {
      logger.error('Generate student QR error:', error);
      res.status(500).json({ error: 'Failed to generate QR code' });
    }
  }
);

/**
 * GET /api/qr/counter/:vendorId
 * Generate counter QR code (for vendor counter, student scans this)
 */
router.get(
  '/counter/:vendorId',
  requireVendor,
  standardLimiter,
  async (req: AuthRequest, res) => {
    try {
      const { vendorId } = req.params;

      // TODO: Verify vendor owns this vendorId

      const qr = await qrService.generateCounterQR(vendorId);

      res.json({
        qrCode: qr.qrCode,
        qrDataUrl: qr.qrDataUrl,
        expiresIn: parseInt(process.env.QR_EXPIRY_SECONDS || '300'),
      });
    } catch (error: any) {
      logger.error('Generate counter QR error:', error);
      res.status(500).json({ error: 'Failed to generate QR code' });
    }
  }
);

/**
 * POST /api/qr/validate
 * Validate QR code (internal use)
 */
router.post(
  '/validate',
  standardLimiter,
  async (req: AuthRequest, res) => {
    try {
      const { qrCode, expectedType } = req.body;

      if (!qrCode || !expectedType) {
        res.status(400).json({ error: 'QR code and expected type required' });
        return;
      }

      const validation = await qrService.validateQR(qrCode, expectedType);

      res.json(validation);
    } catch (error: any) {
      logger.error('Validate QR error:', error);
      res.status(500).json({ error: 'Failed to validate QR code' });
    }
  }
);

export default router;




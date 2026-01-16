import QRCode from 'qrcode';
import crypto from 'crypto';
import { pool } from '../config/database';
import { getRedisClient } from '../config/database';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

const QR_SECRET = process.env.QR_SECRET_KEY || 'default-qr-secret-key';
const QR_EXPIRY_SECONDS = parseInt(process.env.QR_EXPIRY_SECONDS || '300'); // 5 minutes default

export interface QRCodeData {
  userId: string;
  qrType: 'student' | 'counter';
  vendorId?: string;
  timestamp: number;
  nonce: string;
}

export class QRService {
  /**
   * Generate a signed QR code payload
   */
  private generateQRPayload(
    userId: string,
    qrType: 'student' | 'counter',
    vendorId?: string
  ): QRCodeData {
    return {
      userId,
      qrType,
      vendorId,
      timestamp: Date.now(),
      nonce: uuidv4(),
    };
  }

  /**
   * Sign QR payload with HMAC
   */
  private signQRPayload(payload: QRCodeData): string {
    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', QR_SECRET)
      .update(payloadString)
      .digest('hex');
    return `${payloadString}:${signature}`;
  }

  /**
   * Verify QR signature
   */
  private verifyQRSignature(signedPayload: string): QRCodeData | null {
    try {
      const [payloadString, signature] = signedPayload.split(':');
      if (!payloadString || !signature) {
        return null;
      }

      const expectedSignature = crypto
        .createHmac('sha256', QR_SECRET)
        .update(payloadString)
        .digest('hex');

      if (signature !== expectedSignature) {
        return null;
      }

      const payload: QRCodeData = JSON.parse(payloadString);
      return payload;
    } catch (error) {
      logger.error('QR signature verification error:', error);
      return null;
    }
  }

  /**
   * Generate student QR code (for student to show at counter)
   */
  async generateStudentQR(userId: string): Promise<{ qrCode: string; qrDataUrl: string }> {
    const payload = this.generateQRPayload(userId, 'student');
    const signedPayload = this.signQRPayload(payload);

    // Store QR in database with expiration
    const expiresAt = new Date(Date.now() + QR_EXPIRY_SECONDS * 1000);
    const codeHash = crypto.createHash('sha256').update(signedPayload).digest('hex');

    await pool.query(
      `INSERT INTO qr_codes (code_hash, user_id, qr_type, expires_at, metadata)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (code_hash) DO NOTHING`,
      [codeHash, userId, 'student', expiresAt, JSON.stringify(payload)]
    );

    // Store in Redis for fast validation (with TTL)
    const redis = await getRedisClient();
    await redis.setEx(
      `qr:${codeHash}`,
      QR_EXPIRY_SECONDS,
      JSON.stringify({ userId, qrType: 'student', expiresAt: expiresAt.toISOString() })
    );

    // Generate QR code image
    const qrDataUrl = await QRCode.toDataURL(signedPayload, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2,
    });

    return {
      qrCode: signedPayload,
      qrDataUrl,
    };
  }

  /**
   * Generate counter QR code (for vendor counter, student scans this)
   */
  async generateCounterQR(vendorId: string): Promise<{ qrCode: string; qrDataUrl: string }> {
    const payload = this.generateQRPayload('', 'counter', vendorId);
    const signedPayload = this.signQRPayload(payload);

    const expiresAt = new Date(Date.now() + QR_EXPIRY_SECONDS * 1000);
    const codeHash = crypto.createHash('sha256').update(signedPayload).digest('hex');

    await pool.query(
      `INSERT INTO qr_codes (code_hash, vendor_id, qr_type, expires_at, metadata)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (code_hash) DO NOTHING`,
      [codeHash, vendorId, 'counter', expiresAt, JSON.stringify(payload)]
    );

    // Store in Redis
    const redis = await getRedisClient();
    await redis.setEx(
      `qr:${codeHash}`,
      QR_EXPIRY_SECONDS,
      JSON.stringify({ vendorId, qrType: 'counter', expiresAt: expiresAt.toISOString() })
    );

    // Generate QR code image
    const qrDataUrl = await QRCode.toDataURL(signedPayload, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2,
    });

    return {
      qrCode: signedPayload,
      qrDataUrl,
    };
  }

  /**
   * Validate QR code (check signature, expiration, and replay attack)
   */
  async validateQR(qrCode: string, expectedType: 'student' | 'counter'): Promise<{
    valid: boolean;
    payload?: QRCodeData;
    error?: string;
  }> {
    // Verify signature
    const payload = this.verifyQRSignature(qrCode);
    if (!payload) {
      return { valid: false, error: 'Invalid QR signature' };
    }

    // Check type
    if (payload.qrType !== expectedType) {
      return { valid: false, error: 'QR type mismatch' };
    }

    // Check expiration
    const now = Date.now();
    const age = now - payload.timestamp;
    if (age > QR_EXPIRY_SECONDS * 1000) {
      return { valid: false, error: 'QR code expired' };
    }

    // Check if already used (replay attack prevention)
    const codeHash = crypto.createHash('sha256').update(qrCode).digest('hex');
    const qrRecord = await pool.query(
      'SELECT is_used, expires_at FROM qr_codes WHERE code_hash = $1',
      [codeHash]
    );

    if (qrRecord.rows.length === 0) {
      return { valid: false, error: 'QR code not found in database' };
    }

    const record = qrRecord.rows[0];
    if (record.is_used) {
      return { valid: false, error: 'QR code already used' };
    }

    // Check expiration in database
    if (new Date(record.expires_at) < new Date()) {
      return { valid: false, error: 'QR code expired' };
    }

    // Check in Redis cache
    const redis = await getRedisClient();
    const cached = await redis.get(`qr:${codeHash}`);
    if (!cached) {
      return { valid: false, error: 'QR code expired or invalid' };
    }

    return { valid: true, payload };
  }

  /**
   * Mark QR code as used
   */
  async markQRAsUsed(
    qrCode: string,
    usedBy: string,
    transactionId?: string
  ): Promise<void> {
    const codeHash = crypto.createHash('sha256').update(qrCode).digest('hex');

    await pool.query(
      `UPDATE qr_codes 
       SET is_used = true, used_at = CURRENT_TIMESTAMP, used_by = $1, transaction_id = $2
       WHERE code_hash = $3 AND is_used = false`,
      [usedBy, transactionId, codeHash]
    );

    // Remove from Redis cache
    const redis = await getRedisClient();
    await redis.del(`qr:${codeHash}`);
  }

  /**
   * Get QR code details
   */
  async getQRDetails(qrCode: string): Promise<any> {
    const codeHash = crypto.createHash('sha256').update(qrCode).digest('hex');
    const result = await pool.query(
      `SELECT q.*, u.full_name as user_name, v.name as vendor_name
       FROM qr_codes q
       LEFT JOIN users u ON q.user_id = u.id
       LEFT JOIN vendors v ON q.vendor_id = v.id
       WHERE q.code_hash = $1`,
      [codeHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }
}

export const qrService = new QRService();




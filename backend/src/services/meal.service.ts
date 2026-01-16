import { pool } from '../config/database';
import { walletService } from './wallet.service';
import { qrService } from './qr.service';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

export interface MealTransaction {
  id: string;
  studentId: string;
  walletId: string;
  vendorId: string;
  menuItemId?: string;
  amount: number;
  mealType?: string;
  itemName?: string;
  qrCodeId?: string;
  transactionStatus: string;
  paymentStatus: string;
  metadata?: any;
  createdAt: Date;
  processedAt?: Date;
}

export interface ProcessMealRequest {
  studentQR?: string; // Student shows QR at counter
  counterQR?: string; // Student scans counter QR
  vendorId: string;
  menuItemId: string;
  amount: number;
  studentId?: string; // If authenticated via API
}

export class MealService {
  /**
   * Process meal transaction (consumption-based billing)
   * This is the core flow: student scans/gets scanned, meal is charged
   */
  async processMealTransaction(request: ProcessMealRequest): Promise<MealTransaction> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Determine student ID from QR or request
      let studentId: string;

      if (request.studentQR) {
        // Vendor scans student QR
        const qrValidation = await qrService.validateQR(request.studentQR, 'student');
        if (!qrValidation.valid || !qrValidation.payload) {
          throw new Error(qrValidation.error || 'Invalid student QR code');
        }
        studentId = qrValidation.payload.userId;
      } else if (request.counterQR) {
        // Student scans counter QR
        const qrValidation = await qrService.validateQR(request.counterQR, 'counter');
        if (!qrValidation.valid || !qrValidation.payload) {
          throw new Error(qrValidation.error || 'Invalid counter QR code');
        }
        if (qrValidation.payload.vendorId !== request.vendorId) {
          throw new Error('QR code vendor mismatch');
        }
        if (!request.studentId) {
          throw new Error('Student ID required when scanning counter QR');
        }
        studentId = request.studentId;
      } else if (request.studentId) {
        // Direct API call (for testing/admin)
        studentId = request.studentId;
      } else {
        throw new Error('Either studentQR, counterQR, or studentId must be provided');
      }

      // Verify vendor exists and is active
      const vendorResult = await client.query(
        'SELECT * FROM vendors WHERE id = $1 AND is_active = true',
        [request.vendorId]
      );

      if (vendorResult.rows.length === 0) {
        throw new Error('Vendor not found or inactive');
      }

      // Verify menu item exists and get details
      const menuItemResult = await client.query(
        'SELECT * FROM menu_items WHERE id = $1 AND vendor_id = $2 AND is_available = true',
        [request.menuItemId, request.vendorId]
      );

      if (menuItemResult.rows.length === 0) {
        throw new Error('Menu item not found or unavailable');
      }

      const menuItem = menuItemResult.rows[0];
      const finalAmount = request.amount || parseFloat(menuItem.price);

      // Verify student exists
      const studentResult = await client.query(
        'SELECT * FROM users WHERE id = $1 AND role = $2 AND is_active = true',
        [studentId, 'student']
      );

      if (studentResult.rows.length === 0) {
        throw new Error('Student not found or inactive');
      }

      // Get wallet
      const wallet = await walletService.getOrCreateWallet(studentId);

      // Debit wallet (atomic operation)
      const walletTransaction = await walletService.debitWallet(
        studentId,
        finalAmount,
        'meal_purchase',
        undefined, // Will set after transaction creation
        `Meal purchase: ${menuItem.name} at ${vendorResult.rows[0].name}`,
        {
          vendorId: request.vendorId,
          vendorName: vendorResult.rows[0].name,
          menuItemId: request.menuItemId,
          menuItemName: menuItem.name,
          mealType: menuItem.meal_type,
        }
      );

      // Create meal transaction record
      const qrCodeHash = request.studentQR
        ? require('crypto').createHash('sha256').update(request.studentQR).digest('hex')
        : request.counterQR
        ? require('crypto').createHash('sha256').update(request.counterQR).digest('hex')
        : null;

      let qrCodeId = null;
      if (qrCodeHash) {
        const qrResult = await client.query(
          'SELECT id FROM qr_codes WHERE code_hash = $1',
          [qrCodeHash]
        );
        if (qrResult.rows.length > 0) {
          qrCodeId = qrResult.rows[0].id;
        }
      }

      const transactionResult = await client.query(
        `INSERT INTO meal_transactions 
         (student_id, wallet_id, vendor_id, menu_item_id, amount, meal_type, item_name,
          qr_code_id, transaction_status, payment_status, metadata, processed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', 'paid', $9, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          studentId,
          wallet.id,
          request.vendorId,
          request.menuItemId,
          finalAmount,
          menuItem.meal_type,
          menuItem.name,
          qrCodeId,
          JSON.stringify({
            walletTransactionId: walletTransaction.id,
            vendorCode: vendorResult.rows[0].vendor_code,
          }),
        ]
      );

      const mealTransaction = transactionResult.rows[0];

      // Update wallet transaction reference
      await client.query(
        'UPDATE wallet_transactions SET reference_id = $1 WHERE id = $2',
        [mealTransaction.id, walletTransaction.id]
      );

      // Mark QR as used
      if (request.studentQR) {
        await qrService.markQRAsUsed(request.studentQR, studentId, mealTransaction.id);
      } else if (request.counterQR) {
        await qrService.markQRAsUsed(request.counterQR, studentId, mealTransaction.id);
      }

      await client.query('COMMIT');

      logger.info(`Meal transaction processed: ${mealTransaction.id} for student ${studentId}, amount ${finalAmount}`);

      return {
        id: mealTransaction.id,
        studentId: mealTransaction.student_id,
        walletId: mealTransaction.wallet_id,
        vendorId: mealTransaction.vendor_id,
        menuItemId: mealTransaction.menu_item_id,
        amount: parseFloat(mealTransaction.amount),
        mealType: mealTransaction.meal_type,
        itemName: mealTransaction.item_name,
        qrCodeId: mealTransaction.qr_code_id,
        transactionStatus: mealTransaction.transaction_status,
        paymentStatus: mealTransaction.payment_status,
        metadata: mealTransaction.metadata,
        createdAt: mealTransaction.created_at,
        processedAt: mealTransaction.processed_at,
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Error processing meal transaction:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get student meal history
   */
  async getStudentMealHistory(
    studentId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<MealTransaction[]> {
    const result = await pool.query(
      `SELECT mt.*, v.name as vendor_name, v.vendor_code, mi.name as item_name
       FROM meal_transactions mt
       LEFT JOIN vendors v ON mt.vendor_id = v.id
       LEFT JOIN menu_items mi ON mt.menu_item_id = mi.id
       WHERE mt.student_id = $1
       ORDER BY mt.created_at DESC
       LIMIT $2 OFFSET $3`,
      [studentId, limit, offset]
    );

    return result.rows.map((row) => ({
      id: row.id,
      studentId: row.student_id,
      walletId: row.wallet_id,
      vendorId: row.vendor_id,
      menuItemId: row.menu_item_id,
      amount: parseFloat(row.amount),
      mealType: row.meal_type,
      itemName: row.item_name,
      qrCodeId: row.qr_code_id,
      transactionStatus: row.transaction_status,
      paymentStatus: row.payment_status,
      metadata: row.metadata,
      createdAt: row.created_at,
      processedAt: row.processed_at,
    }));
  }

  /**
   * Get vendor transactions
   */
  async getVendorTransactions(
    vendorId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100,
    offset: number = 0
  ): Promise<MealTransaction[]> {
    let query = `SELECT mt.*, u.full_name as student_name, u.student_id as student_code
                 FROM meal_transactions mt
                 LEFT JOIN users u ON mt.student_id = u.id
                 WHERE mt.vendor_id = $1 AND mt.transaction_status = 'completed'`;

    const params: any[] = [vendorId];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND mt.created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND mt.created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY mt.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      studentId: row.student_id,
      walletId: row.wallet_id,
      vendorId: row.vendor_id,
      menuItemId: row.menu_item_id,
      amount: parseFloat(row.amount),
      mealType: row.meal_type,
      itemName: row.item_name,
      qrCodeId: row.qr_code_id,
      transactionStatus: row.transaction_status,
      paymentStatus: row.payment_status,
      metadata: row.metadata,
      createdAt: row.created_at,
      processedAt: row.processed_at,
    }));
  }

  /**
   * Get meal consumption statistics
   */
  async getMealStatistics(
    startDate?: Date,
    endDate?: Date,
    mealType?: string
  ): Promise<any> {
    let query = `SELECT 
      COUNT(*) as total_meals,
      COUNT(DISTINCT student_id) as unique_students,
      COUNT(DISTINCT vendor_id) as unique_vendors,
      SUM(amount) as total_revenue,
      meal_type,
      DATE(created_at) as date
      FROM meal_transactions
      WHERE transaction_status = 'completed'`;

    const params: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    if (mealType) {
      query += ` AND meal_type = $${paramIndex}`;
      params.push(mealType);
      paramIndex++;
    }

    query += ` GROUP BY DATE(created_at), meal_type ORDER BY date DESC, meal_type`;

    const result = await pool.query(query, params);

    return result.rows.map((row) => ({
      date: row.date,
      mealType: row.meal_type,
      totalMeals: parseInt(row.total_meals),
      uniqueStudents: parseInt(row.unique_students),
      uniqueVendors: parseInt(row.unique_vendors),
      totalRevenue: parseFloat(row.total_revenue),
    }));
  }
}

export const mealService = new MealService();




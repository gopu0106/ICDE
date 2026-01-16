import { pool } from '../config/database';
import { logger } from '../config/logger';
import { mealService } from './meal.service';

export interface Vendor {
  id: string;
  userId?: string;
  vendorCode: string;
  name: string;
  vendorType: 'mess' | 'canteen';
  location?: string;
  contactPhone?: string;
  contactEmail?: string;
  isActive: boolean;
  settings?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorSettlement {
  id: string;
  vendorId: string;
  settlementPeriodStart: Date;
  settlementPeriodEnd: Date;
  totalTransactions: number;
  totalAmount: number;
  commissionRate: number;
  commissionAmount: number;
  settlementAmount: number;
  status: string;
  paymentReference?: string;
  paidAt?: Date;
  paidBy?: string;
  notes?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export class VendorService {
  /**
   * Get vendor by ID
   */
  async getVendorById(vendorId: string): Promise<Vendor | null> {
    const result = await pool.query('SELECT * FROM vendors WHERE id = $1', [vendorId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      vendorCode: row.vendor_code,
      name: row.name,
      vendorType: row.vendor_type,
      location: row.location,
      contactPhone: row.contact_phone,
      contactEmail: row.contact_email,
      isActive: row.is_active,
      settings: row.settings,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Get vendor by user ID
   */
  async getVendorByUserId(userId: string): Promise<Vendor | null> {
    const result = await pool.query('SELECT * FROM vendors WHERE user_id = $1', [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      vendorCode: row.vendor_code,
      name: row.name,
      vendorType: row.vendor_type,
      location: row.location,
      contactPhone: row.contact_phone,
      contactEmail: row.contact_email,
      isActive: row.is_active,
      settings: row.settings,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Get vendor performance metrics
   */
  async getVendorPerformance(
    vendorId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    let query = `SELECT 
      COUNT(*) as total_transactions,
      SUM(amount) as total_revenue,
      COUNT(DISTINCT student_id) as unique_customers,
      AVG(amount) as average_transaction_value,
      DATE(created_at) as date
      FROM meal_transactions
      WHERE vendor_id = $1 AND transaction_status = 'completed'`;

    const params: any[] = [vendorId];
    let paramIndex = 2;

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

    query += ` GROUP BY DATE(created_at) ORDER BY date DESC`;

    const result = await pool.query(query, params);

    const dailyStats = result.rows.map((row) => ({
      date: row.date,
      totalTransactions: parseInt(row.total_transactions),
      totalRevenue: parseFloat(row.total_revenue),
      uniqueCustomers: parseInt(row.unique_customers),
      averageTransactionValue: parseFloat(row.average_transaction_value),
    }));

    // Get summary
    const summaryResult = await pool.query(
      `SELECT 
        COUNT(*) as total_transactions,
        SUM(amount) as total_revenue,
        COUNT(DISTINCT student_id) as unique_customers,
        COUNT(DISTINCT DATE(created_at)) as active_days
        FROM meal_transactions
        WHERE vendor_id = $1 AND transaction_status = 'completed'
        ${startDate ? `AND created_at >= $2` : ''}
        ${endDate ? `AND created_at <= $${startDate ? '3' : '2'}` : ''}`,
      startDate && endDate
        ? [vendorId, startDate, endDate]
        : startDate
        ? [vendorId, startDate]
        : endDate
        ? [vendorId, endDate]
        : [vendorId]
    );

    const summary = summaryResult.rows[0];

    return {
      summary: {
        totalTransactions: parseInt(summary.total_transactions || 0),
        totalRevenue: parseFloat(summary.total_revenue || 0),
        uniqueCustomers: parseInt(summary.unique_customers || 0),
        activeDays: parseInt(summary.active_days || 0),
      },
      dailyStats,
    };
  }

  /**
   * Create vendor settlement
   */
  async createSettlement(
    vendorId: string,
    periodStart: Date,
    periodEnd: Date,
    commissionRate: number = 0
  ): Promise<VendorSettlement> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get all transactions in period
      const transactions = await mealService.getVendorTransactions(
        vendorId,
        periodStart,
        periodEnd,
        10000,
        0
      );

      const totalTransactions = transactions.length;
      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
      const commissionAmount = (totalAmount * commissionRate) / 100;
      const settlementAmount = totalAmount - commissionAmount;

      // Check if settlement already exists
      const existingResult = await client.query(
        `SELECT * FROM vendor_settlements 
         WHERE vendor_id = $1 
         AND settlement_period_start = $2 
         AND settlement_period_end = $3`,
        [vendorId, periodStart, periodEnd]
      );

      if (existingResult.rows.length > 0) {
        throw new Error('Settlement for this period already exists');
      }

      // Create settlement
      const result = await client.query(
        `INSERT INTO vendor_settlements 
         (vendor_id, settlement_period_start, settlement_period_end, 
          total_transactions, total_amount, commission_rate, commission_amount, 
          settlement_amount, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
         RETURNING *`,
        [
          vendorId,
          periodStart,
          periodEnd,
          totalTransactions,
          totalAmount,
          commissionRate,
          commissionAmount,
          settlementAmount,
        ]
      );

      await client.query('COMMIT');

      const row = result.rows[0];
      return {
        id: row.id,
        vendorId: row.vendor_id,
        settlementPeriodStart: row.settlement_period_start,
        settlementPeriodEnd: row.settlement_period_end,
        totalTransactions: row.total_transactions,
        totalAmount: parseFloat(row.total_amount),
        commissionRate: parseFloat(row.commission_rate),
        commissionAmount: parseFloat(row.commission_amount),
        settlementAmount: parseFloat(row.settlement_amount),
        status: row.status,
        paymentReference: row.payment_reference,
        paidAt: row.paid_at,
        paidBy: row.paid_by,
        notes: row.notes,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating settlement:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get vendor settlements
   */
  async getVendorSettlements(
    vendorId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<VendorSettlement[]> {
    const result = await pool.query(
      `SELECT * FROM vendor_settlements 
       WHERE vendor_id = $1 
       ORDER BY settlement_period_start DESC 
       LIMIT $2 OFFSET $3`,
      [vendorId, limit, offset]
    );

    return result.rows.map((row) => ({
      id: row.id,
      vendorId: row.vendor_id,
      settlementPeriodStart: row.settlement_period_start,
      settlementPeriodEnd: row.settlement_period_end,
      totalTransactions: row.total_transactions,
      totalAmount: parseFloat(row.total_amount),
      commissionRate: parseFloat(row.commission_rate),
      commissionAmount: parseFloat(row.commission_amount),
      settlementAmount: parseFloat(row.settlement_amount),
      status: row.status,
      paymentReference: row.payment_reference,
      paidAt: row.paid_at,
      paidBy: row.paid_by,
      notes: row.notes,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Mark settlement as paid
   */
  async markSettlementPaid(
    settlementId: string,
    paymentReference: string,
    paidBy: string
  ): Promise<void> {
    await pool.query(
      `UPDATE vendor_settlements 
       SET status = 'paid', payment_reference = $1, paid_at = CURRENT_TIMESTAMP, paid_by = $2
       WHERE id = $3`,
      [paymentReference, paidBy, settlementId]
    );
  }

  /**
   * Get all vendors
   */
  async getAllVendors(
    vendorType?: 'mess' | 'canteen',
    isActive?: boolean
  ): Promise<Vendor[]> {
    let query = 'SELECT * FROM vendors WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (vendorType) {
      query += ` AND vendor_type = $${paramIndex}`;
      params.push(vendorType);
      paramIndex++;
    }

    if (isActive !== undefined) {
      query += ` AND is_active = $${paramIndex}`;
      params.push(isActive);
      paramIndex++;
    }

    query += ' ORDER BY name';

    const result = await pool.query(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      vendorCode: row.vendor_code,
      name: row.name,
      vendorType: row.vendor_type,
      location: row.location,
      contactPhone: row.contact_phone,
      contactEmail: row.contact_email,
      isActive: row.is_active,
      settings: row.settings,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}

export const vendorService = new VendorService();




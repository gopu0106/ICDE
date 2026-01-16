import { pool } from '../config/database';
import { logger } from '../config/logger';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-char-key-change-in-prod';
const ALGORITHM = 'aes-256-cbc';

// Encrypt balance for storage
function encryptBalance(balance: number): Buffer {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let encrypted = cipher.update(balance.toString(), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return Buffer.from(iv.toString('hex') + ':' + encrypted);
}

// Decrypt balance from storage
function decryptBalance(encrypted: Buffer): number {
  const parts = encrypted.toString().split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return parseFloat(decrypted);
}

export interface WalletBalance {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  updatedAt: Date;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  transactionType: 'credit' | 'debit';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType: string;
  referenceId?: string;
  description?: string;
  status: string;
  metadata?: any;
  createdAt: Date;
}

export class WalletService {
  /**
   * Get or create wallet for a user
   */
  async getOrCreateWallet(userId: string): Promise<WalletBalance> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if wallet exists
      let result = await client.query(
        'SELECT * FROM wallets WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length > 0) {
        const wallet = result.rows[0];
        await client.query('COMMIT');
        return {
          id: wallet.id,
          userId: wallet.user_id,
          balance: parseFloat(wallet.balance),
          currency: wallet.currency,
          updatedAt: wallet.updated_at,
        };
      }

      // Create new wallet
      result = await client.query(
        `INSERT INTO wallets (user_id, balance, encrypted_balance, currency)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, 0, encryptBalance(0), 'INR']
      );

      await client.query('COMMIT');
      const wallet = result.rows[0];
      return {
        id: wallet.id,
        userId: wallet.user_id,
        balance: parseFloat(wallet.balance),
        currency: wallet.currency,
        updatedAt: wallet.updated_at,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error getting/creating wallet:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(userId: string): Promise<number> {
    const wallet = await this.getOrCreateWallet(userId);
    return wallet.balance;
  }

  /**
   * Credit wallet (atomic operation with double-entry accounting)
   */
  async creditWallet(
    userId: string,
    amount: number,
    referenceType: string,
    referenceId?: string,
    description?: string,
    metadata?: any
  ): Promise<WalletTransaction> {
    if (amount <= 0) {
      throw new Error('Credit amount must be positive');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get wallet with row lock
      const walletResult = await client.query(
        'SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE',
        [userId]
      );

      if (walletResult.rows.length === 0) {
        throw new Error('Wallet not found');
      }

      const wallet = walletResult.rows[0];
      const balanceBefore = parseFloat(wallet.balance);
      const balanceAfter = balanceBefore + amount;

      // Update wallet balance
      await client.query(
        'UPDATE wallets SET balance = $1, encrypted_balance = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [balanceAfter, encryptBalance(balanceAfter), wallet.id]
      );

      // Create credit transaction
      const transactionResult = await client.query(
        `INSERT INTO wallet_transactions 
         (wallet_id, transaction_type, amount, balance_before, balance_after, 
          reference_type, reference_id, description, status, metadata)
         VALUES ($1, 'credit', $2, $3, $4, $5, $6, $7, 'completed', $8)
         RETURNING *`,
        [
          wallet.id,
          amount,
          balanceBefore,
          balanceAfter,
          referenceType,
          referenceId,
          description,
          JSON.stringify(metadata || {}),
        ]
      );

      await client.query('COMMIT');

      const transaction = transactionResult.rows[0];
      return {
        id: transaction.id,
        walletId: transaction.wallet_id,
        transactionType: 'credit',
        amount: parseFloat(transaction.amount),
        balanceBefore: parseFloat(transaction.balance_before),
        balanceAfter: parseFloat(transaction.balance_after),
        referenceType: transaction.reference_type,
        referenceId: transaction.reference_id,
        description: transaction.description,
        status: transaction.status,
        metadata: transaction.metadata,
        createdAt: transaction.created_at,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error crediting wallet:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Debit wallet (atomic operation with double-entry accounting)
   * Returns transaction if successful, throws error if insufficient balance
   */
  async debitWallet(
    userId: string,
    amount: number,
    referenceType: string,
    referenceId?: string,
    description?: string,
    metadata?: any
  ): Promise<WalletTransaction> {
    if (amount <= 0) {
      throw new Error('Debit amount must be positive');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get wallet with row lock (prevents race conditions)
      const walletResult = await client.query(
        'SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE',
        [userId]
      );

      if (walletResult.rows.length === 0) {
        throw new Error('Wallet not found');
      }

      const wallet = walletResult.rows[0];
      const balanceBefore = parseFloat(wallet.balance);

      // Check sufficient balance
      if (balanceBefore < amount) {
        await client.query('ROLLBACK');
        throw new Error('Insufficient wallet balance');
      }

      const balanceAfter = balanceBefore - amount;

      // Update wallet balance
      await client.query(
        'UPDATE wallets SET balance = $1, encrypted_balance = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [balanceAfter, encryptBalance(balanceAfter), wallet.id]
      );

      // Create debit transaction
      const transactionResult = await client.query(
        `INSERT INTO wallet_transactions 
         (wallet_id, transaction_type, amount, balance_before, balance_after, 
          reference_type, reference_id, description, status, metadata)
         VALUES ($1, 'debit', $2, $3, $4, $5, $6, $7, 'completed', $8)
         RETURNING *`,
        [
          wallet.id,
          amount,
          balanceBefore,
          balanceAfter,
          referenceType,
          referenceId,
          description,
          JSON.stringify(metadata || {}),
        ]
      );

      await client.query('COMMIT');

      const transaction = transactionResult.rows[0];
      return {
        id: transaction.id,
        walletId: transaction.wallet_id,
        transactionType: 'debit',
        amount: parseFloat(transaction.amount),
        balanceBefore: parseFloat(transaction.balance_before),
        balanceAfter: parseFloat(transaction.balance_after),
        referenceType: transaction.reference_type,
        referenceId: transaction.reference_id,
        description: transaction.description,
        status: transaction.status,
        metadata: transaction.metadata,
        createdAt: transaction.created_at,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error debiting wallet:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<WalletTransaction[]> {
    const wallet = await this.getOrCreateWallet(userId);

    const result = await pool.query(
      `SELECT wt.* FROM wallet_transactions wt
       WHERE wt.wallet_id = $1
       ORDER BY wt.created_at DESC
       LIMIT $2 OFFSET $3`,
      [wallet.id, limit, offset]
    );

    return result.rows.map((row) => ({
      id: row.id,
      walletId: row.wallet_id,
      transactionType: row.transaction_type,
      amount: parseFloat(row.amount),
      balanceBefore: parseFloat(row.balance_before),
      balanceAfter: parseFloat(row.balance_after),
      referenceType: row.reference_type,
      referenceId: row.reference_id,
      description: row.description,
      status: row.status,
      metadata: row.metadata,
      createdAt: row.created_at,
    }));
  }

  /**
   * Get wallet summary with statistics
   */
  async getWalletSummary(userId: string): Promise<any> {
    const wallet = await this.getOrCreateWallet(userId);

    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE transaction_type = 'debit') as total_debits,
        COUNT(*) FILTER (WHERE transaction_type = 'credit') as total_credits,
        COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'debit'), 0) as total_spent,
        COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'credit'), 0) as total_credited
       FROM wallet_transactions
       WHERE wallet_id = $1`,
      [wallet.id]
    );

    const todayStatsResult = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE transaction_type = 'debit') as today_debits,
        COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'debit'), 0) as today_spent
       FROM wallet_transactions
       WHERE wallet_id = $1 AND DATE(created_at) = CURRENT_DATE`,
      [wallet.id]
    );

    return {
      wallet: {
        id: wallet.id,
        balance: wallet.balance,
        currency: wallet.currency,
      },
      statistics: {
        totalCredits: parseFloat(statsResult.rows[0].total_credits || 0),
        totalDebits: parseFloat(statsResult.rows[0].total_debits || 0),
        totalSpent: parseFloat(statsResult.rows[0].total_spent || 0),
        totalCredited: parseFloat(statsResult.rows[0].total_credited || 0),
        todaySpent: parseFloat(todayStatsResult.rows[0].today_spent || 0),
        todayDebits: parseInt(todayStatsResult.rows[0].today_debits || 0),
      },
    };
  }
}

export const walletService = new WalletService();




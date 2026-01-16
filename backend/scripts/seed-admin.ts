/**
 * Admin Seed Script
 * 
 * Creates a default admin user for local development and demo purposes.
 * This script is idempotent - safe to run multiple times.
 * 
 * Usage: npm run seed:admin
 * 
 * WARNING: This is for LOCAL/DEV use only. Do NOT use in production.
 */

import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { Pool, PoolConfig } from 'pg';

// Load environment variables
dotenv.config();

// Admin credentials (for local dev/demo only)
const ADMIN_EMAIL = 'admin@campus.edu';
const ADMIN_PASSWORD = 'Admin@1234';
const ADMIN_FULL_NAME = 'Campus Admin';
const ADMIN_ROLE = 'admin'; // Database stores lowercase, but we normalize to uppercase in JWT

// Database configuration
const pgConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'campussync',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'password',
};

async function seedAdmin() {
  const pool = new Pool(pgConfig);

  try {
    console.log('🔍 Checking for existing admin user...');

    // Check if admin already exists
    const existingAdmin = await pool.query(
      'SELECT id, email, role FROM users WHERE email = $1 AND role IN ($2, $3)',
      [ADMIN_EMAIL, 'admin', 'super_admin']
    );

    if (existingAdmin.rows.length > 0) {
      console.log('✅ Admin user already exists:');
      console.log(`   Email: ${existingAdmin.rows[0].email}`);
      console.log(`   Role: ${existingAdmin.rows[0].role}`);
      console.log('   Skipping creation.');
      await pool.end();
      return;
    }

    console.log('📝 Creating admin user...');

    // Hash password using same method as auth flow
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, bcryptRounds);

    // Create admin user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, email, full_name, role`,
      [ADMIN_EMAIL, passwordHash, ADMIN_FULL_NAME, ADMIN_ROLE]
    );

    const admin = result.rows[0];

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Admin Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Email:    ${admin.email}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Name:     ${admin.full_name}`);
    console.log(`   Role:     ${admin.role}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🔐 You can now log in at: http://localhost:3001/admin/login');
    console.log('');

  } catch (error: any) {
    console.error('❌ Error creating admin user:');
    console.error(error.message);
    
    if (error.code === '23505') {
      // Unique constraint violation
      console.log('');
      console.log('ℹ️  Admin user may already exist with this email.');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the seed function
if (require.main === module) {
  seedAdmin()
    .then(() => {
      console.log('✨ Seed script completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

export { seedAdmin };


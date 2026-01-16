-- CampusSync Database Schema
-- PostgreSQL Database for Integrated Campus Dining Ecosystem

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users (Students, Admins, Vendors)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id VARCHAR(50) UNIQUE, -- Unique student ID
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'vendor', 'admin', 'super_admin')),
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_student_id ON users(student_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Wallets (Student Wallet Accounts)
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    encrypted_balance BYTEA, -- Encrypted balance for security
    currency VARCHAR(3) DEFAULT 'INR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);

-- Wallet Transactions (Double-Entry Accounting)
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    balance_before DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,
    reference_type VARCHAR(50), -- 'mess_fee', 'topup', 'meal_purchase', 'refund', etc.
    reference_id UUID, -- ID of related entity (meal_transaction, topup, etc.)
    description TEXT,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
    metadata JSONB, -- Additional transaction data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_reference ON wallet_transactions(reference_type, reference_id);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at);
CREATE INDEX idx_wallet_transactions_status ON wallet_transactions(status);

-- Vendors (Messes and Canteens)
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    vendor_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    vendor_type VARCHAR(20) NOT NULL CHECK (vendor_type IN ('mess', 'canteen')),
    location VARCHAR(255),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    settings JSONB, -- Vendor-specific settings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vendors_vendor_code ON vendors(vendor_code);
CREATE INDEX idx_vendors_type ON vendors(vendor_type);
CREATE INDEX idx_vendors_active ON vendors(is_active);

-- Menu Items (Meals/Items available at vendors)
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    item_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    category VARCHAR(50), -- 'breakfast', 'lunch', 'dinner', 'snacks', etc.
    meal_type VARCHAR(20), -- 'breakfast', 'lunch', 'dinner', 'snack'
    is_available BOOLEAN DEFAULT true,
    image_url VARCHAR(500),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vendor_id, item_code)
);

CREATE INDEX idx_menu_items_vendor_id ON menu_items(vendor_id);
CREATE INDEX idx_menu_items_category ON menu_items(category);
CREATE INDEX idx_menu_items_meal_type ON menu_items(meal_type);
CREATE INDEX idx_menu_items_available ON menu_items(is_available);

-- Meal Transactions (Consumption Records)
CREATE TABLE meal_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    meal_type VARCHAR(20), -- 'breakfast', 'lunch', 'dinner', 'snack'
    item_name VARCHAR(255), -- Denormalized for audit
    qr_code_id UUID, -- Reference to qr_codes table
    transaction_status VARCHAR(20) DEFAULT 'completed' CHECK (transaction_status IN ('pending', 'completed', 'cancelled', 'refunded')),
    payment_status VARCHAR(20) DEFAULT 'paid' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    metadata JSONB, -- Additional transaction data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_meal_transactions_student_id ON meal_transactions(student_id);
CREATE INDEX idx_meal_transactions_wallet_id ON meal_transactions(wallet_id);
CREATE INDEX idx_meal_transactions_vendor_id ON meal_transactions(vendor_id);
CREATE INDEX idx_meal_transactions_created_at ON meal_transactions(created_at);
CREATE INDEX idx_meal_transactions_meal_type ON meal_transactions(meal_type);
CREATE INDEX idx_meal_transactions_status ON meal_transactions(transaction_status);

-- QR Codes (Dynamic, Time-bound QR codes)
CREATE TABLE qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_hash VARCHAR(255) UNIQUE NOT NULL, -- Hashed QR code value
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Student who generated QR
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL, -- Counter QR
    qr_type VARCHAR(20) NOT NULL CHECK (qr_type IN ('student', 'counter')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMP WITH TIME ZONE,
    used_by UUID REFERENCES users(id), -- Who scanned/used it
    transaction_id UUID REFERENCES meal_transactions(id), -- Linked transaction
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_qr_codes_hash ON qr_codes(code_hash);
CREATE INDEX idx_qr_codes_user_id ON qr_codes(user_id);
CREATE INDEX idx_qr_codes_vendor_id ON qr_codes(vendor_id);
CREATE INDEX idx_qr_codes_expires_at ON qr_codes(expires_at);
CREATE INDEX idx_qr_codes_used ON qr_codes(is_used);

-- Top-ups (Wallet Recharges)
CREATE TABLE topups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50), -- 'online', 'cash', 'bank_transfer', etc.
    payment_reference VARCHAR(255), -- External payment reference
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES users(id),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_topups_wallet_id ON topups(wallet_id);
CREATE INDEX idx_topups_student_id ON topups(student_id);
CREATE INDEX idx_topups_status ON topups(status);
CREATE INDEX idx_topups_created_at ON topups(created_at);

-- Mess Fees (Initial Prepayments)
CREATE TABLE mess_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    academic_year VARCHAR(20) NOT NULL,
    semester VARCHAR(20),
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'refunded')),
    paid_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mess_fees_student_id ON mess_fees(student_id);
CREATE INDEX idx_mess_fees_wallet_id ON mess_fees(wallet_id);
CREATE INDEX idx_mess_fees_academic_year ON mess_fees(academic_year);

-- Vendor Settlements (Periodic Vendor Payments)
CREATE TABLE vendor_settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    settlement_period_start DATE NOT NULL,
    settlement_period_end DATE NOT NULL,
    total_transactions INTEGER DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    commission_rate DECIMAL(5, 2) DEFAULT 0.00, -- Platform commission %
    commission_amount DECIMAL(12, 2) DEFAULT 0.00,
    settlement_amount DECIMAL(12, 2) NOT NULL, -- Amount to pay vendor
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    payment_reference VARCHAR(255),
    paid_at TIMESTAMP WITH TIME ZONE,
    paid_by UUID REFERENCES users(id),
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vendor_settlements_vendor_id ON vendor_settlements(vendor_id);
CREATE INDEX idx_vendor_settlements_period ON vendor_settlements(settlement_period_start, settlement_period_end);
CREATE INDEX idx_vendor_settlements_status ON vendor_settlements(status);

-- Audit Logs (Immutable Transaction Log)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- 'wallet', 'transaction', 'vendor', etc.
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'transaction', etc.
    user_id UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Sessions (JWT Refresh Tokens)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(500) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mess_fees_updated_at BEFORE UPDATE ON mess_fees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_settlements_updated_at BEFORE UPDATE ON vendor_settlements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (entity_type, entity_id, action, old_values, new_values)
    VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_wallets AFTER INSERT OR UPDATE OR DELETE ON wallets
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_wallet_transactions AFTER INSERT OR UPDATE OR DELETE ON wallet_transactions
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_meal_transactions AFTER INSERT OR UPDATE OR DELETE ON meal_transactions
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

-- Student Wallet Summary View
CREATE OR REPLACE VIEW student_wallet_summary AS
SELECT 
    u.id as student_id,
    u.student_id as student_code,
    u.full_name,
    w.balance,
    COUNT(DISTINCT mt.id) as total_meals,
    COALESCE(SUM(CASE WHEN mt.created_at >= CURRENT_DATE THEN mt.amount ELSE 0 END), 0) as today_spending,
    COALESCE(SUM(CASE WHEN mt.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN mt.amount ELSE 0 END), 0) as monthly_spending
FROM users u
LEFT JOIN wallets w ON u.id = w.user_id
LEFT JOIN meal_transactions mt ON u.id = mt.student_id
WHERE u.role = 'student'
GROUP BY u.id, u.student_id, u.full_name, w.balance;

-- Vendor Performance View
CREATE OR REPLACE VIEW vendor_performance AS
SELECT 
    v.id as vendor_id,
    v.vendor_code,
    v.name,
    v.vendor_type,
    COUNT(DISTINCT mt.id) as total_transactions,
    COALESCE(SUM(mt.amount), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN mt.created_at >= CURRENT_DATE THEN mt.amount ELSE 0 END), 0) as today_revenue,
    COALESCE(SUM(CASE WHEN mt.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN mt.amount ELSE 0 END), 0) as monthly_revenue,
    COUNT(DISTINCT mt.student_id) as unique_customers
FROM vendors v
LEFT JOIN meal_transactions mt ON v.id = mt.vendor_id AND mt.transaction_status = 'completed'
GROUP BY v.id, v.vendor_code, v.name, v.vendor_type;

-- Meal Consumption Trends View
CREATE OR REPLACE VIEW meal_consumption_trends AS
SELECT 
    DATE(created_at) as date,
    meal_type,
    COUNT(*) as meal_count,
    SUM(amount) as total_amount,
    COUNT(DISTINCT student_id) as unique_students,
    COUNT(DISTINCT vendor_id) as unique_vendors
FROM meal_transactions
WHERE transaction_status = 'completed'
GROUP BY DATE(created_at), meal_type
ORDER BY date DESC, meal_type;




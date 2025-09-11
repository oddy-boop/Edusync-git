-- Platform Pricing System Migration
-- This migration creates the infrastructure for multi-tenant billing

-- 1. Platform pricing configuration table (Super Admin controlled)
CREATE TABLE IF NOT EXISTS platform_pricing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grade_level VARCHAR(50) NOT NULL,
    pricing_type VARCHAR(20) CHECK (pricing_type IN ('per_term', 'per_year')) DEFAULT 'per_term',
    platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    academic_year VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(grade_level, academic_year, pricing_type)
);

-- 2. Create school_fees table for grade/term specific fees (if it doesn't exist)
CREATE TABLE IF NOT EXISTS school_fees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    grade_level VARCHAR(50) NOT NULL,
    term VARCHAR(20) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) DEFAULT 0,
    total_fee DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(school_id, grade_level, term, academic_year, description)
);

-- 3. Update existing school_fee_items table to include platform fees (for compatibility)
ALTER TABLE school_fee_items 
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_fee DECIMAL(10,2);

-- 4. Payment transactions tracking table (Enhanced for dual gateway support)
DROP TABLE IF EXISTS payment_transactions CASCADE;
CREATE TABLE payment_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reference VARCHAR(255) UNIQUE NOT NULL,
    student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
    school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
    gateway VARCHAR(20) NOT NULL CHECK (gateway IN ('paystack', 'stripe')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'initialized', 'completed', 'failed', 'refunded')),
    gateway_response JSONB,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Platform revenue tracking table
DROP TABLE IF EXISTS platform_revenue CASCADE;
CREATE TABLE platform_revenue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    month VARCHAR(7) NOT NULL, -- YYYY-MM format
    currency VARCHAR(10) NOT NULL,
    gateway VARCHAR(20) NOT NULL CHECK (gateway IN ('paystack', 'stripe')),
    total_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(month, currency, gateway)
);

-- 6. School payment configurations for multi-gateway support
DROP TABLE IF EXISTS school_payment_configs CASCADE;
CREATE TABLE school_payment_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE UNIQUE,
    
    -- Paystack configuration
    paystack_public_key VARCHAR(255),
    paystack_secret_key VARCHAR(255),
    paystack_subaccount_code VARCHAR(255),
    
    -- Stripe configuration  
    stripe_account_id VARCHAR(255),
    stripe_account_status VARCHAR(50),
    
    -- Settings
    preferred_gateway VARCHAR(20) DEFAULT 'paystack' CHECK (preferred_gateway IN ('paystack', 'stripe')),
    auto_split_enabled BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_platform_pricing_grade_year ON platform_pricing(grade_level, academic_year);
CREATE INDEX IF NOT EXISTS idx_school_fees_grade_term ON school_fees(grade_level, term, academic_year);
CREATE INDEX IF NOT EXISTS idx_school_fees_school_id ON school_fees(school_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_student ON payment_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_school ON payment_transactions(school_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway ON payment_transactions(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON payment_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_month ON platform_revenue(month);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_gateway ON platform_revenue(gateway);
CREATE INDEX IF NOT EXISTS idx_school_payment_configs_school ON school_payment_configs(school_id);

-- 8. Add super admin platform configuration to schools table (removed - now in platform_configuration)
-- Note: Platform payment keys are now stored in the platform_configuration table

-- 9. Create function to auto-calculate total fees when platform pricing changes
CREATE OR REPLACE FUNCTION update_school_fees_total()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all school_fees records that match the grade level and academic year
    UPDATE school_fees 
    SET 
        platform_fee = NEW.platform_fee,
        total_fee = COALESCE(amount, 0) + NEW.platform_fee,
        updated_at = NOW()
    WHERE 
        grade_level = NEW.grade_level 
        AND academic_year = NEW.academic_year;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger to auto-update school fees when platform pricing changes
DROP TRIGGER IF EXISTS trigger_update_school_fees_total ON platform_pricing;
CREATE TRIGGER trigger_update_school_fees_total
    AFTER INSERT OR UPDATE ON platform_pricing
    FOR EACH ROW
    EXECUTE FUNCTION update_school_fees_total();

-- 11. Insert default platform pricing for common grade levels
INSERT INTO platform_pricing (grade_level, pricing_type, platform_fee, academic_year) VALUES
    ('Creche', 'per_term', 25.00, '2024-2025'),
    ('Nursery 1', 'per_term', 25.00, '2024-2025'),
    ('Nursery 2', 'per_term', 25.00, '2024-2025'),
    ('KG 1', 'per_term', 30.00, '2024-2025'),
    ('KG 2', 'per_term', 30.00, '2024-2025'),
    ('Primary 1', 'per_term', 35.00, '2024-2025'),
    ('Primary 2', 'per_term', 35.00, '2024-2025'),
    ('Primary 3', 'per_term', 35.00, '2024-2025'),
    ('Primary 4', 'per_term', 40.00, '2024-2025'),
    ('Primary 5', 'per_term', 40.00, '2024-2025'),
    ('Primary 6', 'per_term', 40.00, '2024-2025'),
    ('JHS 1', 'per_term', 50.00, '2024-2025'),
    ('JHS 2', 'per_term', 50.00, '2024-2025'),
    ('JHS 3', 'per_term', 50.00, '2024-2025'),
    ('SHS 1', 'per_term', 60.00, '2024-2025'),
    ('SHS 2', 'per_term', 60.00, '2024-2025'),
    ('SHS 3', 'per_term', 60.00, '2024-2025')
ON CONFLICT (grade_level, academic_year, pricing_type) DO NOTHING;

-- 10. RLS Policies

-- Platform pricing: Only super admins can manage
ALTER TABLE platform_pricing ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Super admins can manage platform pricing" ON platform_pricing;
DROP POLICY IF EXISTS "Anyone can view platform pricing" ON platform_pricing;

CREATE POLICY "Super admins can manage platform pricing" ON platform_pricing
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

CREATE POLICY "Anyone can view platform pricing" ON platform_pricing
    FOR SELECT USING (true);

-- School fees: School admins can manage their own school's fees
ALTER TABLE school_fees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "School admins can manage their school's fees" ON school_fees;
DROP POLICY IF EXISTS "Super admins can view all school fees" ON school_fees;
DROP POLICY IF EXISTS "Service role can manage school fees" ON school_fees;

CREATE POLICY "School admins can manage their school's fees" ON school_fees
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM user_roles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Super admins can view all school fees" ON school_fees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Service role can manage school fees
CREATE POLICY "Service role can manage school fees" ON school_fees
    FOR ALL USING (auth.role() = 'service_role');

-- Payment transactions: Users can view their own school's transactions
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their school's payment transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Super admins can view all payment transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Service role can manage payment transactions" ON payment_transactions;

CREATE POLICY "Users can view their school's payment transactions" ON payment_transactions
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM user_roles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Super admins can view all payment transactions" ON payment_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Service role can manage payment transactions
CREATE POLICY "Service role can manage payment transactions" ON payment_transactions
    FOR ALL USING (auth.role() = 'service_role');

-- RLS for platform_revenue table
ALTER TABLE platform_revenue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Super admins can view platform revenue" ON platform_revenue;
DROP POLICY IF EXISTS "Service role can manage platform revenue" ON platform_revenue;

CREATE POLICY "Super admins can view platform revenue" ON platform_revenue
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

CREATE POLICY "Service role can manage platform revenue" ON platform_revenue
    FOR ALL USING (auth.role() = 'service_role');

-- RLS for school_payment_configs table
ALTER TABLE school_payment_configs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Schools can manage their payment config" ON school_payment_configs;
DROP POLICY IF EXISTS "Super admins can view all payment configs" ON school_payment_configs;
DROP POLICY IF EXISTS "Service role can manage payment configs" ON school_payment_configs;

CREATE POLICY "Schools can manage their payment config" ON school_payment_configs
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'teacher')
        )
    );

CREATE POLICY "Super admins can view all payment configs" ON school_payment_configs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

CREATE POLICY "Service role can manage payment configs" ON school_payment_configs
    FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE platform_pricing IS 'Stores platform fees set by super admin for different grade levels';
COMMENT ON TABLE school_fees IS 'Stores grade/term-specific fees for each school with platform fee calculations';
COMMENT ON TABLE payment_transactions IS 'Tracks dual gateway payment transactions with platform fee collection';
COMMENT ON TABLE platform_revenue IS 'Tracks platform revenue by month, currency, and payment gateway';
COMMENT ON TABLE school_payment_configs IS 'Stores school-specific payment gateway configurations';
COMMENT ON FUNCTION update_school_fees_total() IS 'Auto-updates school fees total when platform pricing changes';

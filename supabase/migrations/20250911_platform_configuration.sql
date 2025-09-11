-- Platform Configuration Table Migration
-- This table stores super admin platform-wide configuration

CREATE TABLE IF NOT EXISTS platform_configuration (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- AI Configuration
    openai_api_key TEXT,
    gemini_api_key TEXT,
    claude_api_key TEXT,
    
    -- Payment Platform Configuration
    paystack_public_key TEXT,
    paystack_secret_key TEXT,
    paystack_webhook_secret TEXT,
    
    -- Stripe Configuration (International Payments)
    stripe_publishable_key TEXT,
    stripe_secret_key TEXT,
    stripe_webhook_secret TEXT,
    stripe_connect_client_id TEXT,
    
    -- Platform Settings
    platform_name VARCHAR(255) NOT NULL DEFAULT 'EduSync Platform',
    platform_email VARCHAR(255) NOT NULL,
    support_email VARCHAR(255),
    webhook_url TEXT,
    
    -- Revenue Settings
    auto_collection_enabled BOOLEAN DEFAULT true,
    revenue_account_number VARCHAR(50),
    revenue_bank_code VARCHAR(10),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_platform_configuration_updated ON platform_configuration(updated_at);

-- Enable RLS
ALTER TABLE platform_configuration ENABLE ROW LEVEL SECURITY;

-- Only super admins can access platform configuration
CREATE POLICY "Super admins can manage platform configuration" ON platform_configuration
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Service role can manage platform configuration
CREATE POLICY "Service role can manage platform configuration" ON platform_configuration
    FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE platform_configuration IS 'Stores platform-wide configuration including AI keys and payment settings for super admin';
COMMENT ON COLUMN platform_configuration.openai_api_key IS 'OpenAI API key for platform AI features';
COMMENT ON COLUMN platform_configuration.paystack_secret_key IS 'Platform Paystack secret key for collecting fees';
COMMENT ON COLUMN platform_configuration.auto_collection_enabled IS 'Whether platform fees are automatically collected';

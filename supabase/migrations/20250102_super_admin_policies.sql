-- =========================
-- Super Admin Policies Migration
-- Enables super_admin role with platform-wide access and management
-- Platform pricing, revenue tracking, cross-school visibility
-- =========================

BEGIN;

-- =========================
-- Enable RLS on Core Tables
-- =========================

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_payment_configs ENABLE ROW LEVEL SECURITY;

-- =========================
-- Super Admin: Platform Management
-- =========================

-- Schools: Super admins can manage all schools
CREATE POLICY "Super admins can manage all schools" ON public.schools
    FOR ALL 
    USING (get_my_role() = 'super_admin')
    WITH CHECK (get_my_role() = 'super_admin');

-- User Roles: Super admins can manage all user roles
CREATE POLICY "Super admins can manage all user roles" ON public.user_roles
    FOR ALL 
    USING (get_my_role() = 'super_admin')
    WITH CHECK (get_my_role() = 'super_admin');

-- =========================
-- Super Admin: Platform Pricing Management
-- =========================

-- Platform Pricing: Only super admins can manage platform pricing
CREATE POLICY "Super admins can manage platform pricing" ON public.platform_pricing
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Platform Revenue: Only super admins can view and manage revenue data
CREATE POLICY "Super admins can manage platform revenue" ON public.platform_revenue
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Payment Transactions: Super admins can view all transactions
CREATE POLICY "Super admins can view all payment transactions" ON public.payment_transactions
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- School Payment Configs: Super admins can view all payment configs
CREATE POLICY "Super admins can view all payment configs" ON public.school_payment_configs
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- =========================
-- Super Admin: Cross-School Data Access
-- =========================

-- Enable RLS on school-scoped tables for super admin access
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Super admin policies for cross-school visibility
CREATE POLICY "Super admins can view all teachers" ON public.teachers
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

CREATE POLICY "Super admins can view all students" ON public.students
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

CREATE POLICY "Super admins can view all admins" ON public.admins
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

CREATE POLICY "Super admins can view all accountants" ON public.accountants
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

CREATE POLICY "Super admins can view all school fees" ON public.school_fees
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

CREATE POLICY "Super admins can view all fee payments" ON public.fee_payments
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

CREATE POLICY "Super admins can view all student results" ON public.student_results
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

CREATE POLICY "Super admins can view all attendance records" ON public.attendance_records
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

CREATE POLICY "Super admins can view all school announcements" ON public.school_announcements
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

CREATE POLICY "Super admins can view all audit logs" ON public.audit_logs
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- =========================
-- Super Admin: System Management
-- =========================

-- Assistant Logs: Super admins can view all assistant interactions
ALTER TABLE public.assistant_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all assistant logs" ON public.assistant_logs
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- =========================
-- Public Access (No authentication required)
-- =========================

-- Schools: Public can read schools list (for branch selection)
CREATE POLICY "Public can read schools" ON public.schools
    FOR SELECT 
    TO public 
    USING (true);

-- Platform Pricing: Anyone can view platform pricing (transparency)
CREATE POLICY "Anyone can view platform pricing" ON public.platform_pricing
    FOR SELECT 
    USING (true);

-- News Posts: Public access to published news
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published news posts" ON public.news_posts
    FOR SELECT 
    USING (published_at IS NOT NULL);

-- Super admins can manage all news posts
CREATE POLICY "Super admins can manage all news posts" ON public.news_posts
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

COMMIT;

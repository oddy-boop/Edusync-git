-- Migration: Add RLS policies for assistant_logs table
-- This ensures only admins can access their own assistant logs

-- Enable RLS on assistant_logs table
ALTER TABLE assistant_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view their own assistant logs
CREATE POLICY "Admin can view own assistant logs" ON assistant_logs
FOR SELECT 
USING (
  user_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Policy: Admins can insert their own assistant logs  
CREATE POLICY "Admin can insert own assistant logs" ON assistant_logs
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Policy: Super admins can view all assistant logs in their organization
CREATE POLICY "Super admin can view all assistant logs" ON assistant_logs
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur1
    WHERE ur1.user_id = auth.uid() 
    AND ur1.role = 'super_admin'
    AND EXISTS (
      SELECT 1 FROM user_roles ur2
      WHERE ur2.user_id = assistant_logs.user_id
      AND ur2.school_id = ur1.school_id
    )
  )
);

-- Policy: Service role can insert logs (for logging purposes)
CREATE POLICY "Service role can manage assistant logs" ON assistant_logs
FOR ALL 
USING (
  current_setting('role') = 'service_role'
)
WITH CHECK (
  current_setting('role') = 'service_role'
);

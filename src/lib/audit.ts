import { createClient } from '@/lib/supabase/server';

export interface AuditLogEntry {
  action: string;
  table_name?: string;
  record_id?: string;
  target_id?: string;
  details?: Record<string, any>;
  school_id?: number;
  performed_by?: string;
}

export interface AuditLogOptions {
  skipOnError?: boolean; // Don't throw if audit log fails
  include_sensitive?: boolean; // Include sensitive data in details
}

/**
 * Creates an audit log entry for tracking system actions
 * @param entry The audit log entry data
 * @param options Configuration options
 */
export async function createAuditLog(
  entry: AuditLogEntry, 
  options: AuditLogOptions = { skipOnError: true }
): Promise<{ success: boolean; message?: string; id?: string }> {
  try {
    const supabase = createClient();
    
    // Get current user if not provided
    let performedBy = entry.performed_by;
    if (!performedBy) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        performedBy = user?.id;
      } catch (err) {
        // Continue without user - could be a system action
      }
    }

    // Sanitize details if not including sensitive data
    let sanitizedDetails = entry.details;
    if (entry.details && !options.include_sensitive) {
      sanitizedDetails = sanitizeAuditDetails(entry.details);
    }

    const auditEntry = {
      action: entry.action,
      table_name: entry.table_name || null,
      record_id: entry.record_id || null,
      target_id: entry.target_id || null,
      details: sanitizedDetails ? JSON.stringify(sanitizedDetails) : null,
      school_id: entry.school_id || null,
      performed_by: performedBy || null,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('audit_logs')
      .insert(auditEntry)
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create audit log:', error);
      if (!options.skipOnError) {
        throw error;
      }
      return { success: false, message: error.message };
    }

    return { success: true, id: data?.id };
  } catch (error: any) {
    console.error('Audit log creation failed:', error);
    if (!options.skipOnError) {
      throw error;
    }
    return { success: false, message: error.message || 'Unknown error' };
  }
}

/**
 * Remove sensitive information from audit log details
 */
function sanitizeAuditDetails(details: Record<string, any>): Record<string, any> {
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'auth',
    'credit_card', 'ssn', 'phone', 'email',
    'temporary_password', 'access_token', 'refresh_token'
  ];

  const sanitized = { ...details };
  
  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveFields.some(field => lowerKey.includes(field));
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    }
    
    // Recursively sanitize nested objects
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeAuditDetails(sanitized[key]);
    }
  }
  
  return sanitized;
}

/**
 * Predefined audit actions for consistency
 */
export const AUDIT_ACTIONS = {
  // User Management
  USER_REGISTERED: 'user_registered',
  USER_INVITED: 'user_invited',
  USER_ROLE_ASSIGNED: 'user_role_assigned',
  USER_PROFILE_UPDATED: 'user_profile_updated',
  USER_DELETED: 'user_deleted',
  
  // Authentication
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  PASSWORD_CHANGED: 'password_changed',
  
  // Financial
  PAYMENT_RECORDED: 'payment_recorded',
  PAYMENT_UPDATED: 'payment_updated',
  PAYMENT_DELETED: 'payment_deleted',
  FEE_STRUCTURE_UPDATED: 'fee_structure_updated',
  ARREAR_CREATED: 'arrear_created',
  ARREAR_UPDATED: 'arrear_updated',
  ARREAR_DELETED: 'arrear_deleted',
  
  // Academic
  STUDENT_ADMITTED: 'student_admitted',
  STUDENT_UPDATED: 'student_updated',
  STUDENT_GRADUATED: 'student_graduated',
  RESULTS_ENTERED: 'results_entered',
  RESULTS_UPDATED: 'results_updated',
  
  // Administrative
  SCHOOL_SETTINGS_UPDATED: 'school_settings_updated',
  INVITATION_SENT: 'invitation_sent',
  INVITATION_ACCEPTED: 'invitation_accepted',
  
  // System
  DATA_EXPORTED: 'data_exported',
  SYSTEM_MAINTENANCE: 'system_maintenance',
  ERROR_OCCURRED: 'error_occurred'
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];

/**
 * Convenience function for creating user action audit logs
 */
export async function auditUserAction(
  action: AuditAction,
  details: Record<string, any>,
  options?: { 
    table_name?: string; 
    record_id?: string;
    target_id?: string;
    school_id?: number;
  }
): Promise<{ success: boolean; message?: string }> {
  return createAuditLog({
    action,
    table_name: options?.table_name,
    record_id: options?.record_id,
    target_id: options?.target_id,
    details,
    school_id: options?.school_id
  });
}

/**
 * Get audit logs for a school with pagination
 */
export async function getAuditLogs(
  schoolId?: number,
  options: {
    limit?: number;
    offset?: number;
    action_filter?: string;
    table_filter?: string;
    user_filter?: string;
  } = {}
): Promise<{
  success: boolean;
  data?: any[];
  total?: number;
  message?: string;
}> {
  try {
    const supabase = createClient();
    
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        performed_by_user:performed_by(email)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (schoolId !== undefined) {
      query = query.eq('school_id', schoolId);
    }
    
    if (options.action_filter) {
      query = query.ilike('action', `%${options.action_filter}%`);
    }
    
    if (options.table_filter) {
      query = query.eq('table_name', options.table_filter);
    }
    
    if (options.user_filter) {
      query = query.eq('performed_by', options.user_filter);
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch audit logs:', error);
      return { success: false, message: error.message };
    }

    return {
      success: true,
      data: data || [],
      total: count || 0
    };
  } catch (error: any) {
    console.error('Audit logs fetch failed:', error);
    return { success: false, message: error.message || 'Unknown error' };
  }
}

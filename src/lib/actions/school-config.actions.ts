import { createClient } from "@/lib/supabase/server";

type ActionResponse = {
  success: boolean;
  message: string;
  data?: any;
};

interface PaymentConfig {
  paystack_public_key: string;
  paystack_secret_key: string;
  enable_online_payments: boolean;
  payment_receipt_prefix?: string;
}

interface SMSConfig {
    // New Arkesel fields
    arkesel_api_key?: string | null;
    arkesel_sender_id?: string | null;
    // Legacy Twilio fields (kept for backward compatibility)
    twilio_account_sid?: string | null;
    twilio_auth_token?: string | null;
    twilio_phone_number?: string | null;
    twilio_messaging_service_sid?: string | null;
  enable_sms_notifications: boolean;
}

/**
 * Get payment configuration for a specific school
 */
export async function getSchoolPaymentConfig(schoolId: number): Promise<{data: PaymentConfig | null, error: string | null}> {
    const supabase = createClient();
    
    try {
        const { data, error } = await supabase
            .from('schools')
            .select(`
                paystack_public_key,
                paystack_secret_key,
                enable_online_payments,
                payment_receipt_prefix
            `)
            .eq('id', schoolId)
            .single();
        
        if (error) throw error;
        
        if (!data.paystack_public_key || !data.paystack_secret_key) {
            return {
                data: null,
                error: "Payment configuration is incomplete. Please configure Paystack keys in school settings."
            };
        }
        
        return { data, error: null };
    } catch (error: any) {
        console.error("Error fetching payment config:", error);
        return { data: null, error: error.message };
    }
}

/**
 * Get SMS configuration for a specific school
 */
export async function getSchoolSMSConfig(schoolId: number): Promise<{data: SMSConfig | null, error: string | null}> {
    const supabase = createClient();
    
    try {
        const { data, error } = await supabase
            .from('schools')
            .select(`
                arkesel_api_key,
                arkesel_sender_id,
                twilio_account_sid,
                twilio_auth_token,
                twilio_phone_number,
                twilio_messaging_service_sid,
                enable_sms_notifications
            `)
            .eq('id', schoolId)
            .single();
        
        if (error) throw error;
        
        // Check if all required SMS settings are configured
        // Consider configuration valid if Arkesel API key is present OR legacy Twilio credentials are present
        const hasArkesel = !!data.arkesel_api_key;
        const hasTwilio = !!(data.twilio_account_sid && data.twilio_auth_token && (data.twilio_phone_number || data.twilio_messaging_service_sid));
        if (!hasArkesel && !hasTwilio) {
            return {
                data: null,
                error: "SMS configuration is incomplete. Please configure Arkesel API key or Twilio settings in school settings."
            };
        }
        
        return { data, error: null };
    } catch (error: any) {
        console.error("Error fetching SMS config:", error);
        return { data: null, error: error.message };
    }
}

/**
 * Save payment configuration for a specific school
 */
export async function saveSchoolPaymentConfig(schoolId: number, config: Partial<PaymentConfig>): Promise<ActionResponse> {
    const supabase = createClient();
    
    try {
        const { error } = await supabase
            .from('schools')
            .update({
                paystack_public_key: config.paystack_public_key,
                paystack_secret_key: config.paystack_secret_key,
                enable_online_payments: config.enable_online_payments,
                payment_receipt_prefix: config.payment_receipt_prefix,
                updated_at: new Date().toISOString()
            })
            .eq('id', schoolId);
        
        if (error) throw error;
        
        return {
            success: true,
            message: "Payment configuration updated successfully."
        };
    } catch (error: any) {
        console.error("Error saving payment config:", error);
        return {
            success: false,
            message: `Failed to save payment configuration: ${error.message}`
        };
    }
}

/**
 * Save SMS configuration for a specific school
 */
export async function saveSchoolSMSConfig(schoolId: number, config: Partial<SMSConfig>): Promise<ActionResponse> {
    const supabase = createClient();
    
    try {
        const { error } = await supabase
            .from('schools')
            .update({
                arkesel_api_key: config.arkesel_api_key,
                arkesel_sender_id: config.arkesel_sender_id,
                twilio_account_sid: config.twilio_account_sid,
                twilio_auth_token: config.twilio_auth_token,
                twilio_phone_number: config.twilio_phone_number,
                twilio_messaging_service_sid: config.twilio_messaging_service_sid,
                enable_sms_notifications: config.enable_sms_notifications,
                updated_at: new Date().toISOString()
            })
            .eq('id', schoolId);
        
        if (error) throw error;
        
        return {
            success: true,
            message: "SMS configuration updated successfully."
        };
    } catch (error: any) {
        console.error("Error saving SMS config:", error);
        return {
            success: false,
            message: `Failed to save SMS configuration: ${error.message}`
        };
    }
}

/**
 * Test SMS configuration for a specific school
 */
export async function testSchoolSMSConfig(schoolId: number): Promise<ActionResponse> {
    const { data: config, error: configError } = await getSchoolSMSConfig(schoolId);
    
    if (configError || !config) {
        return {
            success: false,
            message: configError || "SMS configuration not found"
        };
    }

    try {
        // Prefer Arkesel test: call the sms subdomain's account endpoint to validate API key
        const apiKey = (config as any).arkesel_api_key || (config as any).twilio_auth_token || null;
        if (apiKey) {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            headers['Authorization'] = `Bearer ${apiKey}`;
            headers['apiKey'] = apiKey;
            headers['x-api-key'] = apiKey;
            try {
                const resp = await fetch('https://sms.arkesel.com/api/account', { method: 'GET', headers });
                const text = await resp.text();
                if (resp.ok) {
                    return { success: true, message: 'Arkesel OK' };
                }
                try { const json = JSON.parse(text); return { success: false, message: json?.message || json?.error || `Arkesel returned ${resp.status}` }; } catch (e) { return { success: false, message: `Arkesel returned ${resp.status}: ${text.slice(0,200)}` }; }
            } catch (e: any) {
                return { success: false, message: e?.message || String(e) };
            }
        }

        // Fallback legacy Twilio test
        try {
            const Twilio = (await import('twilio')).default;
            const client = Twilio(config.twilio_account_sid || undefined, config.twilio_auth_token || undefined);
            const fromVal = (config.twilio_phone_number || config.twilio_messaging_service_sid) as string | undefined;
            const toVal = config.twilio_phone_number as string | undefined;
            if (!toVal) {
                return { success: false, message: 'No Twilio destination phone number configured to run the legacy Twilio test.' };
            }
            const testMessage = await client.messages.create({
                body: 'This is a test message from your EduSync school management system.',
                from: fromVal,
                to: toVal // Send to the school's own number
            });
            return { success: true, message: `Test message sent successfully. SID: ${testMessage.sid}` };
        } catch (error: any) {
            console.error("Error testing legacy Twilio config:", error);
            return { success: false, message: `Failed to send test message: ${error?.message || String(error)}` };
        }
    } catch (error: any) {
        console.error("Error testing SMS config:", error);
        return {
            success: false,
            message: `Failed to send test message: ${error.message}`
        };
    }
}

/**
 * Test payment configuration for a specific school
 */
export async function testSchoolPaymentConfig(schoolId: number): Promise<ActionResponse> {
    const { data: config, error: configError } = await getSchoolPaymentConfig(schoolId);
    
    if (configError || !config) {
        return {
            success: false,
            message: configError || "Payment configuration not found"
        };
    }

    try {
        // Test Paystack API with a balance check
        const response = await fetch('https://api.paystack.co/balance', {
            headers: {
                'Authorization': `Bearer ${config.paystack_secret_key}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to verify Paystack API key');
        }

        return {
            success: true,
            message: "Payment configuration verified successfully."
        };
    } catch (error: any) {
        console.error("Error testing payment config:", error);
        return {
            success: false,
            message: `Failed to verify payment configuration: ${error.message}`
        };
    }
}

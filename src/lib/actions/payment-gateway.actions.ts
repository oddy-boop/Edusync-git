import { createAuthClient } from '@/lib/supabase/server';

// Payment gateway configuration interface
export interface PaymentGatewayConfig {
  paystack: {
    publicKey: string;
    secretKey: string;
    webhookSecret: string;
  };
}

// Payment processing interface
export interface PaymentRequest {
  amount: number;
  currency: string;
  email: string;
  studentId: string;
  schoolId: string;
  feeType: string;
  reference: string;
  gateway: 'paystack';
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  authorizationUrl?: string;
  reference: string;
  gateway: string;
  error?: string;
}

/**
 * Get platform payment configuration
 */
export async function getPlatformPaymentConfig(): Promise<PaymentGatewayConfig | null> {
  try {
    const supabase = createAuthClient();

    const { data: config, error } = await supabase
      .from('platform_configuration')
      .select(`
        paystack_public_key,
        paystack_secret_key,
        paystack_webhook_secret
      `)
      .single();

    if (error) {
      console.error('Error fetching platform payment config:', error);
      return null;
    }

    return {
      paystack: {
        publicKey: config.paystack_public_key || '',
        secretKey: config.paystack_secret_key || '',
        webhookSecret: config.paystack_webhook_secret || ''
      }
    };
  } catch (error) {
    console.error('Error in getPlatformPaymentConfig:', error);
    return null;
  }
}

/**
 * Get school-specific payment configuration
 */
export async function getSchoolPaymentConfig(schoolId: string): Promise<PaymentGatewayConfig | null> {
  try {
    const supabase = createAuthClient();

    const { data: config, error } = await supabase
      .from('school_settings')
      .select(`
        paystack_public_key,
        paystack_secret_key,
        paystack_subaccount_code
      `)
      .eq('id', schoolId)
      .single();

    if (error) {
      console.error('Error fetching school payment config:', error);
      return null;
    }

    return {
      paystack: {
        publicKey: config.paystack_public_key || '',
        secretKey: config.paystack_secret_key || '',
        webhookSecret: config.paystack_subaccount_code || ''
      }
    };
  } catch (error) {
    console.error('Error in getSchoolPaymentConfig:', error);
    return null;
  }
}

/**
 * Always returns Paystack since it's the only gateway now
 */
export function determinePaymentGateway(currency: string, country?: string): 'paystack' {
  return 'paystack';
}

/**
 * Check if Paystack is available (always true since it supports international payments)
 */
export function isGatewayAvailable(gateway: 'paystack', country: string): boolean {
  return gateway === 'paystack';
}

/**
 * Check if a currency is supported by Paystack
 */
export function isGatewayCurrencySupported(gateway: 'paystack', currency: string): boolean {
  if (gateway === 'paystack') {
    const supportedCurrencies = ['NGN', 'USD', 'GHS', 'ZAR', 'KES'];
    return supportedCurrencies.includes(currency);
  }
  return false;
}

/**
 * Calculate platform fee based on amount and gateway
 * Platform fee is 2% for Paystack
 */
export function calculatePlatformFee(amount: number, gateway: 'paystack'): number {
  if (gateway === 'paystack') {
    return Math.round(amount * 0.02 * 100) / 100; // 2% fee, rounded to 2 decimal places
  }
  return 0;
}

/**
 * Get gateway-specific configuration for payment initialization
 */
export async function getPaymentGatewayConfiguration(
  gateway: 'paystack', 
  schoolId: string
): Promise<any> {
  if (gateway === 'paystack') {
    // Try to get school-specific config first, fall back to platform config
    const schoolConfig = await getSchoolPaymentConfig(schoolId);
    const platformConfig = await getPlatformPaymentConfig();
    
    return {
      publicKey: schoolConfig?.paystack.publicKey || platformConfig?.paystack.publicKey || process.env.PAYSTACK_PUBLIC_KEY || '',
      secretKey: schoolConfig?.paystack.secretKey || platformConfig?.paystack.secretKey || process.env.PAYSTACK_SECRET_KEY || '',
      webhookSecret: schoolConfig?.paystack.webhookSecret || platformConfig?.paystack.webhookSecret || process.env.PAYSTACK_WEBHOOK_SECRET || ''
    };
  }
  return null;
}

/**
 * Initialize payment with Paystack
 */
export async function initializePayment(request: PaymentRequest): Promise<PaymentResponse> {
  try {
    if (request.gateway !== 'paystack') {
      return {
        success: false,
        reference: request.reference,
        gateway: request.gateway,
        error: 'Unsupported payment gateway'
      };
    }

    const config = await getPaymentGatewayConfiguration('paystack', request.schoolId);
    if (!config || !config.secretKey) {
      return {
        success: false,
        reference: request.reference,
        gateway: request.gateway,
        error: 'Payment gateway not configured'
      };
    }

    // Initialize Paystack payment
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: request.email,
        amount: Math.round(request.amount * 100), // Convert to kobo/cents
        currency: request.currency,
        reference: request.reference,
        callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/student/fees/callback`,
        metadata: {
          ...request.metadata,
          student_id: request.studentId,
          school_id: request.schoolId,
          fee_type: request.feeType
        }
      }),
    });

    const result = await paystackResponse.json();

    if (result.status && result.data.authorization_url) {
      return {
        success: true,
        authorizationUrl: result.data.authorization_url,
        reference: request.reference,
        gateway: 'paystack'
      };
    } else {
      return {
        success: false,
        reference: request.reference,
        gateway: 'paystack',
        error: result.message || 'Payment initialization failed'
      };
    }
  } catch (error) {
    console.error('Payment initialization error:', error);
    return {
      success: false,
      reference: request.reference,
      gateway: request.gateway,
      error: 'Payment service unavailable'
    };
  }
}

/**
 * Verify payment status with Paystack
 */
export async function verifyPayment(reference: string, schoolId: string): Promise<any> {
  try {
    const config = await getPaymentGatewayConfiguration('paystack', schoolId);
    if (!config || !config.secretKey) {
      throw new Error('Payment gateway not configured');
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (result.status) {
      return {
        success: true,
        data: result.data,
        gateway: 'paystack'
      };
    } else {
      return {
        success: false,
        error: result.message || 'Payment verification failed',
        gateway: 'paystack'
      };
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    return {
      success: false,
      error: 'Payment verification service unavailable',
      gateway: 'paystack'
    };
  }
}

/**
 * Get supported currencies for display
 */
export function getSupportedCurrencies(): string[] {
  return ['NGN', 'USD', 'GHS', 'ZAR', 'KES'];
}

/**
 * Get payment gateway information
 */
export function getPaymentGatewayInfo(gateway: 'paystack') {
  if (gateway === 'paystack') {
    return {
      name: 'Paystack',
      description: 'Secure payments for African markets and international USD payments',
      supportedCurrencies: getSupportedCurrencies(),
      internationalSupport: true,
      localSupport: true
    };
  }
  return null;
}

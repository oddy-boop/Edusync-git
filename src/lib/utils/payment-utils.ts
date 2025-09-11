/**
 * Client-safe payment utility functions
 * These functions can be safely imported by client components
 */

/**
 * Calculate platform fee for a given amount and gateway
 * This is a pure function with no server dependencies
 */
export function calculatePlatformFee(amount: number, gateway: 'paystack'): number {
  if (gateway === 'paystack') {
    return Math.round(amount * 0.02 * 100) / 100; // 2% fee, rounded to 2 decimal places
  }
  return 0;
}

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate payment reference
 */
export function generatePaymentReference(prefix: string = 'PAY'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
}

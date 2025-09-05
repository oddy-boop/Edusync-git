import { describe, it, expect, vi } from 'vitest';
import * as paymentActions from '../lib/actions/payment.actions';

// Minimal smoke test: mock fetch to Paystack and mock supabase createClient
vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ data: { status: 'success', amount: 5000, customer: { email: 'test@example.com' }, metadata: {} } }) })));

vi.mock('../lib/supabase/server', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({ single: async () => ({ data: null }) }),
      insert: async () => ({ error: null }),
    }),
  }),
}));

describe('verifyPaystackTransaction', () => {
  it('returns success when Paystack reports success and insert works', async () => {
    const res = await paymentActions.verifyPaystackTransaction({ reference: 'T123', userId: '00000000-0000-0000-0000-000000000000' });
    expect(res.success).toBe(true);
  });
});

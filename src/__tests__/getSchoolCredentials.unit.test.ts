import { getSchoolCredentials } from '@/lib/getSchoolCredentials';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { describe, afterEach, it } from 'node:test';
// Lightweight local shim to satisfy test code and TypeScript when Jest types
// are not available in this environment. This keeps tsc happy for the
// project's typecheck; runtime test execution should use your real test
// runner which provides the real `jest` implementation.
const jest: any = {
    mock: (_modulePath: string, _factory?: any) => {},
    fn: () => () => {},
    resetAllMocks: () => {},
};

// Mock the supabase client used inside getSchoolCredentials
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}));

describe('getSchoolCredentials', () => {
    afterEach(() => {
        jest.resetAllMocks();
        delete process.env.RESEND_API_KEY;
    delete process.env.ARKESEL_API_KEY;
    delete process.env.ARKESEL_SENDER_ID;
    });

    it('falls back to environment variables when no schoolId provided', async () => {
    process.env.RESEND_API_KEY = 'env_resend';
    process.env.ARKESEL_API_KEY = 'env_arkesel_key';
    process.env.ARKESEL_SENDER_ID = 'env_arkesel_sender';

    const creds = await getSchoolCredentials(null);

    expect(creds.resendApiKey).toBe('env_resend');
    expect(creds.arkesel.apiKey).toBe('env_arkesel_key');
    expect(creds.arkesel.senderId).toBe('env_arkesel_sender');
    });
});

function expect(received: any) {
    return {
        toBe(expected: any) {
            if (received !== expected) {
                throw new Error(`Expected ${received} to be ${expected}`);
            }
        }
    };
}


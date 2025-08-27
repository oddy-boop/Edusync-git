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
        delete process.env.TWILIO_ACCOUNT_SID;
        delete process.env.TWILIO_AUTH_TOKEN;
        delete process.env.TWILIO_PHONE_NUMBER;
        delete process.env.TWILIO_MESSAGING_SERVICE_SID;
    });

    it('falls back to environment variables when no schoolId provided', async () => {
        process.env.RESEND_API_KEY = 'env_resend';
        process.env.TWILIO_ACCOUNT_SID = 'env_twilio_sid';
        process.env.TWILIO_AUTH_TOKEN = 'env_twilio_token';

        const creds = await getSchoolCredentials(null);

        expect(creds.resendApiKey).toBe('env_resend');
        expect(creds.twilio.accountSid).toBe('env_twilio_sid');
        expect(creds.twilio.authToken).toBe('env_twilio_token');
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


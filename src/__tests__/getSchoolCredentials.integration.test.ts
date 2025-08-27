import { getSchoolCredentials } from '@/lib/getSchoolCredentials';
import { afterEach, beforeEach, describe, it } from 'node:test';
// Lightweight shim for environments without jest types installed.
const jest: any = {
  resetModules: () => {},
};

describe('getSchoolCredentials integration (env fallback)', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.resetModules(); // clear module cache
    process.env = { ...OLD_ENV };
  });
  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('uses env vars when DB values are missing', async () => {
    process.env.RESEND_API_KEY = 'integration_resend_key';
    process.env.TWILIO_ACCOUNT_SID = 'integration_sid';
    process.env.TWILIO_AUTH_TOKEN = 'integration_token';
    process.env.TWILIO_PHONE_NUMBER = '+15551234567';

    const creds = await getSchoolCredentials(null);

    expect(creds.resendApiKey).toBe('integration_resend_key');
    expect(creds.twilio.accountSid).toBe('integration_sid');
    expect(creds.twilio.authToken).toBe('integration_token');
    expect(creds.twilio.phoneNumber).toBe('+15551234567');
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


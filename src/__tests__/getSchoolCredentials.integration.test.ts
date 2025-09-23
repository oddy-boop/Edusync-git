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
  process.env.ARKESEL_API_KEY = 'integration_arkesel_key';
  process.env.ARKESEL_SENDER_ID = 'integration_arkesel_sender';

    const creds = await getSchoolCredentials(null);

    expect(creds.resendApiKey).toBe('integration_resend_key');
  expect(creds.arkesel.apiKey).toBe('integration_arkesel_key');
  expect(creds.arkesel.senderId).toBe('integration_arkesel_sender');
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


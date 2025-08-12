
import { getIronSession, IronSession, IronSessionData } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData extends IronSessionData {
  userId?: number;
  fullName?: string;
  role?: string;
  isLoggedIn: boolean;
}

const secretCookiePassword = process.env.SECRET_COOKIE_PASSWORD;

// Add a check to ensure the secret password is set and sufficiently long.
if (!secretCookiePassword || secretCookiePassword.length < 32) {
    throw new Error(
        'CRITICAL SECURITY ERROR: The SECRET_COOKIE_PASSWORD environment variable is missing, or is not at least 32 characters long. ' +
        'Please set a strong secret in your .env file as instructed in the README.md to proceed.'
    );
}

export const sessionOptions = {
  password: secretCookiePassword,
  cookieName: 'edusync-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  return session;
}

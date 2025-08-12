
import { getIronSession, IronSession, IronSessionData } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData extends IronSessionData {
  userId?: number;
  fullName?: string;
  role?: string;
  isLoggedIn: boolean;
}

export const sessionOptions = {
  password: process.env.SECRET_COOKIE_PASSWORD as string,
  cookieName: 'edusync-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  return session;
}

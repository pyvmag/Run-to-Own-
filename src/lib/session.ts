import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'run-to-own-secure-default-fallback-key'
);

const SESSION_COOKIE_NAME = 'rto_session';

export interface SessionPayload {
  accessToken: string;
  athlete: {
    id: number;
    firstname: string;
    lastname: string;
    username: string;
    city: string;
    country: string;
    profile: string;
    profile_medium: string;
  };
}

/**
 * Encrypts a payload into a signed JWT.
 */
export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);
}

/**
 * Decrypts a signed JWT and returns the payload, or null if invalid.
 */
export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, SECRET_KEY, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Encrypts the athlete session and saves it in a secure HTTP-only cookie.
 */
export async function setSession(payload: SessionPayload) {
  const encrypted = await encrypt(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    path: '/',
  });
}

/**
 * Retrieves the currently decrypted active session payload from cookies.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return (await decrypt(token)) as SessionPayload | null;
}

/**
 * Clears the session cookie on user logout.
 */
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(0), // expire immediately
    path: '/',
  });
}

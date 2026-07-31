import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// ── Cookie constants ──────────────────────────────────────────────
export const SESSION_COOKIE = 'zamine_session';
export const SESSION_MAX_AGE = 365 * 24 * 60 * 60; // 365 days (essentially never expires)

// ── Cookie helpers ─────────────────────────────────────────────────
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export function setSessionCookie(token: string): Record<string, string> {
  return {
    'Set-Cookie': `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_MAX_AGE}`,
  };
}

export function clearSessionCookie(): Record<string, string> {
  return {
    'Set-Cookie': `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`,
  };
}

// ── Session validation ────────────────────────────────────────────
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tokenExpiresAt: Date | null;
}

export async function validateSession(token: string | null): Promise<AuthUser | null> {
  if (!token) return null;

  try {
    const user = await db.user.findUnique({
      where: { sessionToken: token },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tokenExpiresAt: true,
      },
    });

    if (!user) return null;

    // Token expired — clear it from DB
    if (user.tokenExpiresAt && new Date(user.tokenExpiresAt) < new Date()) {
      await db.user.update({
        where: { id: user.id },
        data: { sessionToken: null, tokenExpiresAt: null },
      });
      return null;
    }

    // Sliding expiration: extend by 24 h on every valid request (fire-and-forget)
    const newExpiry = new Date(Date.now() + SESSION_MAX_AGE * 1000);
    db.user.update({ where: { id: user.id }, data: { tokenExpiresAt: newExpiry } }).catch(() => {});

    return user;
  } catch {
    return null;
  }
}

export async function requireAuth(token: string | null): Promise<AuthUser | null> {
  return validateSession(token);
}

export async function requireAdmin(token: string | null): Promise<AuthUser | null> {
  const user = await validateSession(token);
  if (!user || user.role !== 'admin') return null;
  return user;
}

// ── Response helpers ───────────────────────────────────────────────
export function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Não autorizado' }, {
    status: 401,
    headers: clearSessionCookie(),
  });
}

export function forbidden(msg = 'Acesso restrito a administradores'): NextResponse {
  return NextResponse.json({ error: msg }, { status: 403 });
}

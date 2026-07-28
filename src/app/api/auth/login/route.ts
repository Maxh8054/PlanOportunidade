import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { rateLimit, getClientIp, trackFailedLogin, isIpBlockedForBruteForce } from '@/lib/rate-limit';
import { setSessionCookie, SESSION_MAX_AGE } from '@/lib/auth';
import { auditLog } from '@/lib/audit-log';

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_RATE_MAX = 10;               // 10 login attempts per IP per 15 min
const LOGIN_RATE_WINDOW = 15 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    // ── Global brute-force check: IP trying too many different accounts ──
    if (isIpBlockedForBruteForce(ip)) {
      auditLog({ action: 'brute_force_blocked', ip, details: 'IP blocked for trying too many different accounts' });
      return NextResponse.json(
        { error: 'Acesso temporariamente bloqueado. Tente novamente mais tarde.' },
        { status: 429 },
      );
    }

    // ── Rate limiting by IP ──────────────────────────────────────
    const rl = rateLimit(ip, LOGIN_RATE_MAX, LOGIN_RATE_WINDOW);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Muitas tentativas de login. Aguarde alguns minutos.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((rl.resetTime - Date.now()) / 1000)) },
        },
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Formato de email inválido' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    if (!user) {
      // Track failed attempt for global brute-force detection
      trackFailedLogin(ip, email);
      auditLog({ action: 'login_failed', userEmail: email, ip, details: 'User not found' });
      return NextResponse.json({ error: 'Email ou senha incorretos' }, { status: 401 });
    }

    // Check if locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      auditLog({ action: 'login_blocked', userId: user.id, userEmail: user.email, userName: user.name, ip, details: 'Account locked due to too many failed attempts' });
      return NextResponse.json({
        error: 'Conta temporariamente bloqueada. Contate o administrador.',
        locked: true,
      }, { status: 403 });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      // Track failed attempt for global brute-force detection
      const bruteResult = trackFailedLogin(ip, user.email);

      const newAttempts = user.loginAttempts + 1;
      const updateData: Record<string, unknown> = { loginAttempts: newAttempts };

      if (newAttempts >= MAX_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
        updateData.loginAttempts = 0;
        auditLog({ action: 'user_locked', userId: user.id, userEmail: user.email, userName: user.name, ip, details: `Locked for ${LOCK_DURATION_MS / 60000} minutes after ${MAX_ATTEMPTS} failed attempts` });
      } else {
        auditLog({ action: 'login_failed', userId: user.id, userEmail: user.email, userName: user.name, ip, details: `Failed attempt ${newAttempts}` });
      }

      await db.user.update({ where: { id: user.id }, data: updateData });

      // Generic error message — don't reveal remaining attempts
      if (bruteResult.blocked) {
        return NextResponse.json({ error: 'Acesso temporariamente bloqueado.' }, { status: 429 });
      }

      return NextResponse.json({ error: 'Email ou senha incorretos' }, { status: 401 });
    }

    // ── Successful login ────────────────────────────────────────
    const sessionToken = crypto.randomUUID();
    const tokenExpiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

    await db.user.update({
      where: { id: user.id },
      data: {
        sessionToken,
        tokenExpiresAt,
        loginAttempts: 0,
        lockedUntil: null,
      },
    });

    auditLog({ action: 'login_success', userId: user.id, userEmail: user.email, userName: user.name, ip });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    }, {
      headers: setSessionCookie(sessionToken),
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

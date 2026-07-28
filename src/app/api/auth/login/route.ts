import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { setSessionCookie, SESSION_MAX_AGE } from '@/lib/auth';

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_RATE_MAX = 10;               // 10 login attempts per IP per 15 min
const LOGIN_RATE_WINDOW = 15 * 60 * 1000;

export async function POST(request: Request) {
  try {
    // ── Rate limiting by IP ──────────────────────────────────────
    const ip = getClientIp(request);
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
      return NextResponse.json({ error: 'Email ou senha incorretos' }, { status: 401 });
    }

    // Check if locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
      return NextResponse.json({
        error: `Conta bloqueada. Tente novamente em ${remainingMinutes} minutos.`,
        locked: true,
      }, { status: 403 });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      const newAttempts = user.loginAttempts + 1;
      const updateData: Record<string, unknown> = { loginAttempts: newAttempts };

      if (newAttempts >= MAX_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
        updateData.loginAttempts = 0;
      }

      await db.user.update({ where: { id: user.id }, data: updateData });

      const remaining = MAX_ATTEMPTS - newAttempts;
      if (remaining > 0) {
        return NextResponse.json({
          error: `Email ou senha incorretos. ${remaining} tentativa(s) restante(s).`,
          remaining,
        }, { status: 401 });
      } else {
        return NextResponse.json({
          error: 'Muitas tentativas. Conta bloqueada por 15 minutos.',
          locked: true,
        }, { status: 403 });
      }
    }

    // Generate session token (full UUID — 128-bit entropy)
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

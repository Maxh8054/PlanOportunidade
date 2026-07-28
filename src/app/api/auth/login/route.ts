import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
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
        lockedUntil: user.lockedUntil,
      }, { status: 403 });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      const newAttempts = user.loginAttempts + 1;
      const updateData: Record<string, unknown> = { loginAttempts: newAttempts };

      // Lock if max attempts reached
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

    // Generate session token
    const sessionToken = crypto.randomUUID().slice(0, 32);

    await db.user.update({
      where: { id: user.id },
      data: {
        sessionToken,
        loginAttempts: 0,
        lockedUntil: null,
      },
    });

    return NextResponse.json({
      token: sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

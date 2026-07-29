import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { rateLimit, getClientIp, resetRateLimit } from '@/lib/rate-limit';
import { validatePassword, isCommonPassword } from '@/lib/password-strength';
import { auditLog } from '@/lib/audit-log';

const FORGOT_RATE_MAX = 1;              // 1 request per email per 15 min
const FORGOT_RATE_WINDOW = 15 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const { email, newPassword } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    if (!newPassword) {
      return NextResponse.json({ error: 'Nova senha é obrigatória' }, { status: 400 });
    }

    // ── Rate limiting by EMAIL (not IP) — 1 request per email per 15 min ──
    const rl = rateLimit(`forgot:${email.toLowerCase().trim()}`, FORGOT_RATE_MAX, FORGOT_RATE_WINDOW);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Muitas solicitações para este email. Aguarde alguns minutos.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((rl.resetTime - Date.now()) / 1000)) },
        },
      );
    }

    // ── Password strength validation ───────────────────────────
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return NextResponse.json({
        error: 'Senha fraca. Requisitos: ' + validation.errors.join(', '),
        validation,
      }, { status: 400 });
    }

    // Block common passwords
    if (isCommonPassword(newPassword)) {
      return NextResponse.json({
        error: 'Esta senha é muito comum. Escolha uma senha mais segura.',
      }, { status: 400 });
    }

    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Formato de email inválido' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    // Always return same message for security (don't reveal if email exists)
    if (!user) {
      auditLog({ action: 'password_request', userEmail: email, ip, details: 'User not found' });
      return NextResponse.json({
        message: 'Se o email estiver cadastrado, uma solicitação será enviada ao administrador.',
      });
    }

    // Check if there's already a pending request for this user
    const existingPending = await db.passwordResetRequest.findFirst({
      where: { userId: user.id, status: 'pending' },
    });

    if (existingPending) {
      return NextResponse.json({
        message: 'Você já possui uma solicitação pendente. Aguarde o administrador aprovar.',
        alreadyRequested: true,
      });
    }

    // Hash the desired password and create a pending request
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.passwordResetRequest.create({
      data: {
        userId: user.id,
        newGeneratedPassword: hashedPassword,
        desiredPassword: newPassword,       // plaintext for admin viewing (cleared on resolve)
        status: 'pending',
      },
    });

    auditLog({ action: 'password_request', userId: user.id, userEmail: user.email, userName: user.name, ip });

    return NextResponse.json({
      message: 'Solicitação enviada! Aguarde o administrador aprovar a troca de senha.',
      requested: true,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

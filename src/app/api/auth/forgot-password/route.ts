import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

function generatePassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 4; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    // Always return same message for security (don't reveal if email exists)
    if (!user) {
      return NextResponse.json({
        message: 'Se o email estiver cadastrado, uma solicitação será enviada ao administrador.',
      });
    }

    // Check if there's already a pending request for this user
    const existingPending = await db.passwordResetRequest.findFirst({
      where: {
        userId: user.id,
        status: 'pending',
      },
    });

    if (existingPending) {
      return NextResponse.json({
        message: 'Você já possui uma solicitação pendente. Aguarde o administrador aprovar.',
        alreadyRequested: true,
      });
    }

    // Generate new password and create a pending request
    const newPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.passwordResetRequest.create({
      data: {
        userId: user.id,
        newGeneratedPassword: hashedPassword,
        status: 'pending',
      },
    });

    return NextResponse.json({
      message: 'Solicitação enviada! Aguarde o administrador aprovar a troca de senha.',
      requested: true,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

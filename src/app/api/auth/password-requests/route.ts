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

// GET - List password reset requests (admin only)
export async function GET(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const admin = await db.user.findUnique({
      where: { sessionToken: token },
      select: { id: true, role: true },
    });

    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const requests = await db.passwordResetRequest.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const resolved = await db.passwordResetRequest.findMany({
      where: { status: { in: ['approved', 'rejected'] } },
      orderBy: { resolvedAt: 'desc' },
      take: 20,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        resolvedByAdmin: {
          select: { name: true },
        },
      },
    });

    // Manually get admin info for resolved (since relation is by string id)
    const resolvedWithAdmin = await Promise.all(resolved.map(async (r) => {
      let resolvedByName = 'Sistema';
      if (r.resolvedBy) {
        const adminUser = await db.user.findUnique({ where: { id: r.resolvedBy }, select: { name: true } });
        if (adminUser) resolvedByName = adminUser.name;
      }
      return { ...r, resolvedByName };
    }));

    return NextResponse.json({
      pending: requests.map(r => ({
        id: r.id,
        userId: r.userId,
        userName: r.user.name,
        userEmail: r.user.email,
        createdAt: r.createdAt,
      })),
      resolved: resolvedWithAdmin.map(r => ({
        id: r.id,
        userId: r.userId,
        userName: r.user.name,
        userEmail: r.user.email,
        status: r.status,
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt,
        resolvedByName: r.resolvedByName,
        newPassword: r.status === 'approved' ? r.newGeneratedPassword : null,
      })),
    });
  } catch (error) {
    console.error('Password requests list error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Approve or reject a password reset request (admin only)
export async function POST(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const admin = await db.user.findUnique({
      where: { sessionToken: token },
      select: { id: true, role: true, name: true },
    });

    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const { requestId, action } = await request.json();

    if (!requestId || !action) {
      return NextResponse.json({ error: 'Parâmetros obrigatórios: requestId, action' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Ação inválida. Use "approve" ou "reject".' }, { status: 400 });
    }

    const resetRequest = await db.passwordResetRequest.findUnique({
      where: { id: requestId },
    });

    if (!resetRequest) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }

    if (resetRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Esta solicitação já foi resolvida' }, { status: 400 });
    }

    let newPasswordPlain: string | null = null;

    if (action === 'approve') {
      // The password was already hashed and stored when the request was created
      // But we need to generate a NEW plain password to show to the admin
      newPasswordPlain = generatePassword();
      const newHashedPassword = await bcrypt.hash(newPasswordPlain, 10);

      // Update user password
      await db.user.update({
        where: { id: resetRequest.userId },
        data: {
          password: newHashedPassword,
          loginAttempts: 0,
          lockedUntil: null,
          sessionToken: null,
        },
      });

      // Update request with approved status and the plain password for display
      await db.passwordResetRequest.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          newGeneratedPassword: newPasswordPlain,
          resolvedAt: new Date(),
          resolvedBy: admin.id,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Senha atualizada com sucesso!',
        newPassword: newPasswordPlain,
        userName: (await db.user.findUnique({ where: { id: resetRequest.userId }, select: { name: true } }))?.name,
      });
    } else {
      // Reject
      await db.passwordResetRequest.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          newGeneratedPassword: '',
          resolvedAt: new Date(),
          resolvedBy: admin.id,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Solicitação rejeitada.',
      });
    }
  } catch (error) {
    console.error('Password request action error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List password reset requests (admin only)
export async function GET(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const admin = await db.user.findFirst({
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
        newPassword: null, // user chose their own password, admin doesn't see it
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

    const admin = await db.user.findFirst({
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

    if (action === 'approve') {
      // The user chose their desired password (already hashed when request was created)
      // Just copy it to the user account
      await db.user.update({
        where: { id: resetRequest.userId },
        data: {
          password: resetRequest.newGeneratedPassword, // the hash the user chose
          loginAttempts: 0,
          lockedUntil: null,
          sessionToken: null,
        },
      });

      // Update request status
      await db.passwordResetRequest.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          resolvedAt: new Date(),
          resolvedBy: admin.id,
        },
      });

      const userName = (await db.user.findUnique({ where: { id: resetRequest.userId }, select: { name: true } }))?.name;

      return NextResponse.json({
        success: true,
        message: 'Senha atualizada com sucesso! O usuário já pode logar com a nova senha.',
        userName,
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

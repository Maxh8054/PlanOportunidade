import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List password reset requests + locked users (admin only)
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

    // Fetch locked users (lockedUntil > now)
    const lockedUsers = await db.user.findMany({
      where: {
        lockedUntil: { gt: new Date() },
      },
      select: {
        id: true,
        name: true,
        email: true,
        loginAttempts: true,
        lockedUntil: true,
      },
      orderBy: { lockedUntil: 'desc' },
    });

    return NextResponse.json({
      pending: requests.map(r => ({
        id: r.id,
        userId: r.userId,
        userName: r.user.name,
        userEmail: r.user.email,
        desiredPassword: r.desiredPassword,
        createdAt: r.createdAt,
      })),
      resolved: resolvedWithAdmin.map(r => ({
        id: r.id,
        userId: r.userId,
        userName: r.user.name,
        userEmail: r.user.email,
        status: r.status,
        desiredPassword: r.desiredPassword,
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt,
        resolvedByName: r.resolvedByName,
      })),
      lockedUsers: lockedUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        loginAttempts: u.loginAttempts,
        lockedUntil: u.lockedUntil,
      })),
    });
  } catch (error) {
    console.error('Password requests list error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Approve, reject, or unlock (admin only)
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

    const body = await request.json();
    const { action } = body;

    // Unlock action
    if (action === 'unlock') {
      const { userId } = body;

      if (!userId) {
        return NextResponse.json({ error: 'Parâmetro obrigatório: userId' }, { status: 400 });
      }

      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
      }

      await db.user.update({
        where: { id: userId },
        data: {
          loginAttempts: 0,
          lockedUntil: null,
          sessionToken: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Login de ${user.name} desbloqueado com sucesso!`,
        userName: user.name,
      });
    }

    // Delete a single resolved request from history
    if (action === 'delete') {
      const { requestId } = body;
      if (!requestId) {
        return NextResponse.json({ error: 'Parâmetro obrigatório: requestId' }, { status: 400 });
      }
      const req = await db.passwordResetRequest.findUnique({ where: { id: requestId } });
      if (!req) {
        return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 });
      }
      await db.passwordResetRequest.delete({ where: { id: requestId } });
      return NextResponse.json({ success: true, message: 'Solicitação removida do histórico.' });
    }

    // Delete all resolved requests from history
    if (action === 'deleteAll') {
      const result = await db.passwordResetRequest.deleteMany({
        where: { status: { in: ['approved', 'rejected'] } },
      });
      return NextResponse.json({
        success: true,
        message: `${result.count} solicitação(ões) removida(s) do histórico.`,
      });
    }

    // Approve or reject password reset request
    const { requestId } = body;

    if (!requestId || !action) {
      return NextResponse.json({ error: 'Parâmetros obrigatórios: requestId, action' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Ação inválida. Use "approve", "reject", "unlock", "delete" ou "deleteAll".' }, { status: 400 });
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
          desiredPassword: '',
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

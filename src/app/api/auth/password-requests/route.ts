import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionToken, requireAdmin, unauthorized, forbidden } from '@/lib/auth';

// GET - List password reset requests + locked users (admin only)
export async function GET() {
  try {
    const token = await getSessionToken();
    const admin = await requireAdmin(token);
    if (!admin) return forbidden();

    const requests = await db.passwordResetRequest.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const resolved = await db.passwordResetRequest.findMany({
      where: { status: { in: ['approved', 'rejected'] } },
      orderBy: { resolvedAt: 'desc' },
      take: 20,
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const resolvedWithAdmin = await Promise.all(resolved.map(async (r) => {
      let resolvedByName = 'Sistema';
      if (r.resolvedBy) {
        const adminUser = await db.user.findUnique({ where: { id: r.resolvedBy }, select: { name: true } });
        if (adminUser) resolvedByName = adminUser.name;
      }
      return { ...r, resolvedByName };
    }));

    const lockedUsers = await db.user.findMany({
      where: { lockedUntil: { gt: new Date() } },
      select: { id: true, name: true, email: true, loginAttempts: true, lockedUntil: true },
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

// POST - Approve, reject, unlock, delete, deleteAll (admin only)
export async function POST(request: Request) {
  try {
    const token = await getSessionToken();
    const admin = await requireAdmin(token);
    if (!admin) return forbidden();

    const body = await request.json();
    const { action } = body;

    // ── Unlock ────────────────────────────────────────────────────
    if (action === 'unlock') {
      const { userId } = body;
      if (!userId) return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 });

      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

      await db.user.update({
        where: { id: userId },
        data: { loginAttempts: 0, lockedUntil: null, sessionToken: null, tokenExpiresAt: null },
      });

      return NextResponse.json({ success: true, message: `Login de ${user.name} desbloqueado!` });
    }

    // ── Delete single ─────────────────────────────────────────────
    if (action === 'delete') {
      const { requestId } = body;
      if (!requestId) return NextResponse.json({ error: 'requestId obrigatório' }, { status: 400 });
      const req = await db.passwordResetRequest.findUnique({ where: { id: requestId } });
      if (!req) return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 });
      await db.passwordResetRequest.delete({ where: { id: requestId } });
      return NextResponse.json({ success: true, message: 'Solicitação removida.' });
    }

    // ── Delete all resolved ───────────────────────────────────────
    if (action === 'deleteAll') {
      const result = await db.passwordResetRequest.deleteMany({ where: { status: { in: ['approved', 'rejected'] } } });
      return NextResponse.json({ success: true, message: `${result.count} registro(s) removido(s).` });
    }

    // ── Approve / Reject ──────────────────────────────────────────
    const { requestId } = body;
    if (!requestId || !action) return NextResponse.json({ error: 'requestId e action obrigatórios' }, { status: 400 });
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
    }

    const resetRequest = await db.passwordResetRequest.findUnique({ where: { id: requestId } });
    if (!resetRequest) return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    if (resetRequest.status !== 'pending') return NextResponse.json({ error: 'Já resolvida.' }, { status: 400 });

    if (action === 'approve') {
      await db.user.update({
        where: { id: resetRequest.userId },
        data: {
          password: resetRequest.newGeneratedPassword,
          loginAttempts: 0,
          lockedUntil: null,
          sessionToken: null,
          tokenExpiresAt: null,
        },
      });

      await db.passwordResetRequest.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          desiredPassword: '',       // clear plaintext password from DB
          newGeneratedPassword: '', // clear hash
          resolvedAt: new Date(),
          resolvedBy: admin.id,
        },
      });

      const userName = (await db.user.findUnique({ where: { id: resetRequest.userId }, select: { name: true } }))?.name;
      return NextResponse.json({ success: true, message: 'Senha atualizada com sucesso!', userName });
    } else {
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

      return NextResponse.json({ success: true, message: 'Solicitação rejeitada.' });
    }
  } catch (error) {
    console.error('Password request action error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

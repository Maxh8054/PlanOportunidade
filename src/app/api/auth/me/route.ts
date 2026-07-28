import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionToken, clearSessionCookie, validateSession } from '@/lib/auth';
import { auditLog } from '@/lib/audit-log';

export async function GET() {
  try {
    const token = await getSessionToken();
    const user = await validateSession(token);

    if (!user) {
      return NextResponse.json({ error: 'Sessão inválida ou expirada' }, {
        status: 401,
        headers: clearSessionCookie(),
      });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = await getSessionToken();

    // Get user info before clearing session for audit
    let userName: string | null = null;
    let userEmail: string | null = null;
    let userId: string | null = null;

    if (token) {
      const user = await validateSession(token);
      if (user) {
        userName = user.name;
        userEmail = user.email;
        userId = user.id;
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }

    // Clear session from database
    await db.user.updateMany({
      where: { sessionToken: token },
      data: { sessionToken: null, tokenExpiresAt: null },
    });

    auditLog({ action: 'logout', userId, userEmail, userName });

    return NextResponse.json({ success: true }, {
      headers: clearSessionCookie(),
    });
  } catch (error) {
    console.error('Auth logout error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionToken, clearSessionCookie, validateSession } from '@/lib/auth';

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

export async function POST() {
  try {
    const token = await getSessionToken();
    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }

    // Clear session from database
    await db.user.updateMany({
      where: { sessionToken: token },
      data: { sessionToken: null, tokenExpiresAt: null },
    });

    return NextResponse.json({ success: true }, {
      headers: clearSessionCookie(),
    });
  } catch (error) {
    console.error('Auth logout error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

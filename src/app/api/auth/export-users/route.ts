import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionToken, requireAdmin, forbidden } from '@/lib/auth';

// GET - Export all users' emails for SEED_PASSWORDS JSON format (admin only)
export async function GET() {
  try {
    const token = await getSessionToken();
    const admin = await requireAdmin(token);
    if (!admin) return forbidden();

    const users = await db.user.findMany({
      select: { email: true, role: true },
      orderBy: { role: 'asc' }, // admins first
    });

    // Build SEED_PASSWORDS JSON template
    const seedJson: Record<string, string> = {};
    for (const user of users) {
      seedJson[user.email] = `TrocarAqui_${user.email.split('@')[0]}@2026!`;
    }

    return NextResponse.json({
      users: users.map(u => ({ email: u.email, role: u.role })),
      seedPasswordsTemplate: seedJson,
    });
  } catch (error) {
    console.error('Export users error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

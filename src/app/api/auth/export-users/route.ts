import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionToken, requireAdmin, forbidden } from '@/lib/auth';
import { getClientIp } from '@/lib/rate-limit';
import { auditLog } from '@/lib/audit-log';

// GET - Export all users' passwords in SEED_PASSWORDS JSON format (admin only)
export async function GET(request: Request) {
  try {
    const token = await getSessionToken();
    const admin = await requireAdmin(token);
    if (!admin) return forbidden();

    const ip = getClientIp(request);

    const users = await db.user.findMany({
      select: { email: true, knownPassword: true },
      orderBy: { email: 'asc' },
    });

    // Build SEED_PASSWORDS JSON — same format as the env var
    const seedPasswords: Record<string, string> = {};
    for (const user of users) {
      // Use knownPassword if available, otherwise use placeholder
      seedPasswords[user.email] = user.knownPassword || `TrocarAqui_${user.email.split('@')[0]}@2026!`;
    }

    // Audit log — track who exported and when
    auditLog({
      action: 'passwords_exported',
      userId: admin.id,
      userEmail: admin.email,
      userName: admin.name,
      ip,
      details: `Exported SEED_PASSWORDS JSON for ${users.length} users`,
    });

    return NextResponse.json({
      totalUsers: users.length,
      seedPasswordsTemplate: seedPasswords,
    });
  } catch (error) {
    console.error('Export users error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

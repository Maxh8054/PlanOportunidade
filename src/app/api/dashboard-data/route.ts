import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionToken, validateSession, unauthorized, forbidden } from '@/lib/auth';

export async function GET() {
  try {
    const token = await getSessionToken();
    const user = await validateSession(token);
    if (!user) return unauthorized();

    const record = await db.dashboardData.findUnique({ where: { id: 'singleton' } });

    if (!record) {
      return NextResponse.json({ data: [], excelHeadersByOrigin: {}, updatedAt: null });
    }

    return NextResponse.json({
      data: JSON.parse(record.data),
      totalRecords: record.totalRecords,
      excelHeadersByOrigin: JSON.parse(record.excelHeadersByOrigin),
      updatedAt: record.updatedAt,
    });
  } catch (error) {
    console.error('GET dashboard-data error:', error);
    return NextResponse.json({ data: [], excelHeadersByOrigin: {}, updatedAt: null });
  }
}

export async function POST(request: Request) {
  try {
    const token = await getSessionToken();
    const admin = await validateSession(token);
    if (!admin || admin.role !== 'admin') return forbidden('Apenas administradores podem alterar os dados.');

    const body = await request.json();

    await db.dashboardData.upsert({
      where: { id: 'singleton' },
      update: {
        data: JSON.stringify(body.data),
        totalRecords: body.totalRecords ?? 0,
        excelHeadersByOrigin: JSON.stringify(body.excelHeadersByOrigin ?? {}),
      },
      create: {
        id: 'singleton',
        data: JSON.stringify(body.data),
        totalRecords: body.totalRecords ?? 0,
        excelHeadersByOrigin: JSON.stringify(body.excelHeadersByOrigin ?? {}),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST dashboard-data error:', error);
    return NextResponse.json({ success: false, error: 'Erro ao salvar dados.' }, { status: 500 });
  }
}

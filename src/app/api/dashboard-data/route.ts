import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const record = await db.dashboardData.findUnique({
      where: { id: "singleton" },
    });

    if (!record) {
      return NextResponse.json({ data: [], updatedAt: null });
    }

    return NextResponse.json({
      data: JSON.parse(record.data),
      totalRecords: record.totalRecords,
      updatedAt: record.updatedAt,
    });
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ data: [], updatedAt: null });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    await db.dashboardData.upsert({
      where: { id: "singleton" },
      update: {
        data: JSON.stringify(body.data),
        totalRecords: body.totalRecords ?? 0,
      },
      create: {
        id: "singleton",
        data: JSON.stringify(body.data),
        totalRecords: body.totalRecords ?? 0,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

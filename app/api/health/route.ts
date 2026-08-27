import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// 公开的数据库连通性检查(不泄露数据,仅 SELECT 1)
export async function GET() {
  const t0 = Date.now();
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return NextResponse.json({
      ok: true,
      db: { connected: true, latencyMs: Date.now() - t0 },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, db: { connected: false }, error: msg },
      { status: 500 }
    );
  }
}

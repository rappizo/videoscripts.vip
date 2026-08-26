import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeCase } from "@/lib/serializers";
import { seedCasesIfEmpty } from "@/lib/cases";

export const dynamic = "force-dynamic";

export async function GET() {
  await seedCasesIfEmpty();
  const cases = await prisma.case.findMany({ orderBy: [{ category: "asc" }, { createdAt: "asc" }] });
  return NextResponse.json({ cases: cases.map(serializeCase) });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ownsProject, sessionUid } from "@/lib/access";
import { serializeMaterial } from "@/lib/serializers";
import { handleError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  type: z.enum(["fact", "data", "quote", "feature", "keyword", "story"]).optional(),
  content: z.string().min(1).max(2000).optional(),
  isRequired: z.boolean().optional(),
});

async function materialWithProject(id: string) {
  return prisma.material.findUnique({ where: { id }, include: { project: true } });
}

// 编辑素材
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const uid = await sessionUid(request);
    const material = await materialWithProject(id);
    if (!material || !ownsProject(uid, material.project.userId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const updated = await prisma.material.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ material: serializeMaterial(updated) });
  } catch (e) {
    return handleError(e);
  }
}

// 删除素材
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const uid = await sessionUid(request);
    const material = await materialWithProject(id);
    if (!material || !ownsProject(uid, material.project.userId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.material.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

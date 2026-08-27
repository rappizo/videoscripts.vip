import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { accessibleProject, sessionUid } from "@/lib/access";
import { serializeMaterial } from "@/lib/serializers";
import { handleError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

const materialSchema = z.object({
  type: z.enum(["fact", "data", "quote", "feature", "keyword", "story"]),
  content: z.string().min(1).max(2000),
  isRequired: z.boolean().default(true),
});

// 项目内新增素材
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const uid = await sessionUid(request);
    const project = await accessibleProject(uid, id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = await request.json().catch(() => null);
    const parsed = materialSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const material = await prisma.material.create({
      data: {
        projectId: id,
        type: parsed.data.type,
        content: parsed.data.content,
        isRequired: parsed.data.isRequired,
      },
    });
    return NextResponse.json({ material: serializeMaterial(material) });
  } catch (e) {
    return handleError(e);
  }
}

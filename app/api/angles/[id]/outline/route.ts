import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { buildProjectContext } from "@/lib/projectContext";
import { generateOutline } from "@/lib/pipeline/outlineStage";
import { serializeOutline } from "@/lib/serializers";
import { handleError, missingKeyError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  hookText: z.string().min(1).max(500),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!process.env.AI_API_KEY) return missingKeyError();
  const { id } = await params;
  try {
    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "hookText is required" }, { status: 400 });
    }
    const angle = await prisma.angle.findUniqueOrThrow({ where: { id } });
    const ctx = await buildProjectContext(angle.projectId);
    const result = await generateOutline(
      ctx,
      { title: angle.title, premise: angle.premise },
      parsed.data.hookText
    );
    const outline = await prisma.outline.upsert({
      where: { angleId: id },
      create: {
        angleId: id,
        sections: JSON.stringify(result.sections),
        status: "draft",
      },
      update: {
        sections: JSON.stringify(result.sections),
        status: "draft",
      },
    });
    return NextResponse.json({
      outline: serializeOutline(outline),
      coverageOk: result.coverageOk,
      missing: result.missing,
    });
  } catch (e) {
    return handleError(e);
  }
}

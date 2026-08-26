import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildProjectContext } from "@/lib/projectContext";
import { generateHooks } from "@/lib/pipeline/hookStage";
import { serializeHook } from "@/lib/serializers";
import { handleError, missingKeyError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!process.env.AI_API_KEY) return missingKeyError();
  const { id } = await params;
  try {
    const angle = await prisma.angle.findUniqueOrThrow({ where: { id }, include: { project: true } });
    const ctx = await buildProjectContext(angle.projectId);
    const candidates = await generateHooks(
      ctx,
      { title: angle.title, premise: angle.premise },
      Number(process.env.HOOK_COUNT || 12)
    );
    const created = [];
    for (const c of candidates) {
      const hook = await prisma.hook.create({
        data: {
          angleId: id,
          text: c.text,
          hookType: c.hookType,
          scores: JSON.stringify(c.scores),
          total: c.total,
        },
      });
      created.push(serializeHook(hook));
    }
    return NextResponse.json({ hooks: created });
  } catch (e) {
    return handleError(e);
  }
}

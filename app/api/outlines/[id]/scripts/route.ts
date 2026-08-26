import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { buildProjectContext, previousScriptSummaries } from "@/lib/projectContext";
import { generateScript } from "@/lib/pipeline/scriptStage";
import { reviewAndRefine } from "@/lib/pipeline/reviewStage";
import { mapLimit } from "@/lib/pipeline/utils";
import { serializeReview, serializeScript } from "@/lib/serializers";
import { handleError, missingKeyError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  hookText: z.string().min(1).max(500).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!process.env.AI_API_KEY) return missingKeyError();
  const { id } = await params;
  try {
    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body ?? {});
    const outline = await prisma.outline.findUniqueOrThrow({
      where: { id },
      include: { angle: { include: { hooks: true } } },
    });
    const ctx = await buildProjectContext(outline.angle.projectId);

    // 钩子:优先取已选中,否则 body 传入
    const selectedHook = outline.angle.hooks.find((h) => h.selected);
    const hookText = parsed.data?.hookText || selectedHook?.text || "";
    if (!hookText) {
      return NextResponse.json({ error: "No hook chosen. Select a hook first." }, { status: 400 });
    }

    const sections = JSON.parse(outline.sections);
    const summaries = await previousScriptSummaries(id);

    // 3 个候选,不同牌组并行生成
    const count = Number(process.env.SCRIPT_COUNT || 3);
    const drafts = await mapLimit(Array.from({ length: count }), 3, () =>
      generateScript(ctx, outline.angle.title, hookText, sections)
    );

    // 逐个评审+改写(串行,避免打爆限流)
    const results = [];
    for (const draft of drafts) {
      const refined = await reviewAndRefine(
        ctx,
        outline.angle.title,
        hookText,
        sections,
        draft.segments,
        draft.cards,
        summaries
      );
      const script = await prisma.script.create({
        data: {
          outlineId: id,
          hookText,
          segments: JSON.stringify(refined.segments),
          cards: JSON.stringify(refined.cards),
          status: refined.passed ? "draft" : "draft",
          reviews: {
            create: refined.reviews.map((r, i) => ({
              dimensions: JSON.stringify(r.dimensions),
              findings: JSON.stringify(r.findings),
              avgScore: r.avgScore,
              passed: r.passed,
              attempt: i,
            })),
          },
        },
        include: { reviews: true },
      });
      results.push({
        ...serializeScript(script),
        reviews: script.reviews.map(serializeReview),
      });
    }
    return NextResponse.json({ scripts: results });
  } catch (e) {
    return handleError(e);
  }
}

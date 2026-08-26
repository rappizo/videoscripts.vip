import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildProjectContext, previousScriptSummaries } from "@/lib/projectContext";
import { reviewAndRefine } from "@/lib/pipeline/reviewStage";
import { serializeReview, serializeScript } from "@/lib/serializers";
import { handleError, missingKeyError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

// 对现有脚本重新评审+定向改写
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!process.env.AI_API_KEY) return missingKeyError();
  const { id } = await params;
  try {
    const script = await prisma.script.findUniqueOrThrow({
      where: { id },
      include: { outline: { include: { angle: true } } },
    });
    const ctx = await buildProjectContext(script.outline.angle.projectId);
    const sections = JSON.parse(script.outline.sections);
    const segments = JSON.parse(script.segments);
    const cards = JSON.parse(script.cards);
    const summaries = await previousScriptSummaries(script.outlineId);

    const refined = await reviewAndRefine(
      ctx,
      script.outline.angle.title,
      script.hookText,
      sections,
      segments,
      cards,
      summaries
    );

    const newReviews = [];
    for (const [i, r] of refined.reviews.entries()) {
      const created = await prisma.review.create({
        data: {
          scriptId: id,
          dimensions: JSON.stringify(r.dimensions),
          findings: JSON.stringify(r.findings),
          avgScore: r.avgScore,
          passed: r.passed,
          attempt: i,
        },
      });
      newReviews.push(created);
    }

    const updated = await prisma.script.update({
      where: { id },
      data: { segments: JSON.stringify(refined.segments), cards: JSON.stringify(refined.cards) },
      include: { reviews: { orderBy: { createdAt: "asc" } } },
    });

    return NextResponse.json({
      script: {
        ...serializeScript(updated),
        reviews: updated.reviews.map(serializeReview),
      },
      newReviews: newReviews.map(serializeReview),
    });
  } catch (e) {
    return handleError(e);
  }
}

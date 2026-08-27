import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { MASTER_UID, ownsProject, sessionUid } from "@/lib/access";
import { launchJob, updateJobProgress } from "@/lib/jobs";
import { buildEditPreferences, buildProjectContext, previousScriptSummaries } from "@/lib/projectContext";
import { reviewAndRefine } from "@/lib/pipeline/reviewStage";
import { handleError, missingKeyError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  // 0 = 只评审一次不改写;>0 = 评审后最多改写 N 轮直至通过
  maxRounds: z.number().int().min(0).max(5).optional(),
});

// 对现有脚本重新评审+定向改写(后台任务)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!process.env.AI_API_KEY) return missingKeyError();
  const { id } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body ?? {});
    const maxRounds = parsed.success ? (parsed.data.maxRounds ?? 3) : 3;
    const uid = await sessionUid(request);
    const script = await prisma.script.findUnique({
      where: { id },
      include: { outline: { include: { angle: { include: { project: true } } } } },
    });
    if (!script || !ownsProject(uid, script.outline.angle.project.userId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const jobId = await launchJob(
      { projectId: script.outline.angle.projectId, stage: "review", userId: uid && uid !== MASTER_UID ? uid : null },
      async (jobId) => {
        const ctx = await buildProjectContext(script.outline.angle.projectId);
        const sections = JSON.parse(script.outline.sections);
        const segments = JSON.parse(script.segments);
        const cards = JSON.parse(script.cards);
        const summaries = await previousScriptSummaries(script.outlineId);
        const editPrefs = await buildEditPreferences(script.outline.angle.projectId);

        const refined = await reviewAndRefine(
          ctx,
          script.outline.angle.title,
          script.hookText,
          sections,
          segments,
          cards,
          summaries,
          maxRounds,
          async (round) => {
            await updateJobProgress(jobId, { round, phase: "review" });
          },
          editPrefs
        );

        for (const [i, r] of refined.reviews.entries()) {
          await prisma.review.create({
            data: {
              scriptId: id,
              dimensions: JSON.stringify(r.dimensions),
              findings: JSON.stringify(r.findings),
              avgScore: r.avgScore,
              passed: r.passed,
              attempt: i,
            },
          });
        }

        await prisma.script.update({
          where: { id },
          data: { segments: JSON.stringify(refined.segments), cards: JSON.stringify(refined.cards) },
        });
      }
    );
    return NextResponse.json({ jobId });
  } catch (e) {
    return handleError(e);
  }
}

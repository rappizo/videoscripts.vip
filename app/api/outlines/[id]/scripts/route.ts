import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { MASTER_UID, ownsProject, sessionUid } from "@/lib/access";
import { launchJob, updateJobProgress } from "@/lib/jobs";
import { buildEditPreferences, buildProjectContext, previousScriptSummaries } from "@/lib/projectContext";
import { generateScript } from "@/lib/pipeline/scriptStage";
import { reviewAndRefine } from "@/lib/pipeline/reviewStage";
import { mapLimit } from "@/lib/pipeline/utils";
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
    const uid = await sessionUid(request);
    const outline = await prisma.outline.findUnique({
      where: { id },
      include: { angle: { include: { hooks: true, project: true } } },
    });
    if (!outline || !ownsProject(uid, outline.angle.project.userId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // 钩子:优先取已选中,否则 body 传入
    const selectedHook = outline.angle.hooks.find((h) => h.selected);
    const hookText = parsed.data?.hookText || selectedHook?.text || "";
    if (!hookText) {
      return NextResponse.json({ error: "No hook chosen. Select a hook first." }, { status: 400 });
    }

    const jobId = await launchJob(
      { projectId: outline.angle.projectId, stage: "scripts", userId: uid && uid !== MASTER_UID ? uid : null },
      async (jobId) => {
        const ctx = await buildProjectContext(outline.angle.projectId);
        const sections = JSON.parse(outline.sections);
        const summaries = await previousScriptSummaries(id);
        const editPrefs = await buildEditPreferences(outline.angle.projectId);

        // 3 个候选,不同牌组并行生成
        const count = Number(process.env.SCRIPT_COUNT || 3);
        const drafts = await mapLimit(Array.from({ length: count }), 3, () =>
          generateScript(ctx, outline.angle.title, hookText, sections, "", editPrefs)
        );

        // 逐个评审+改写(串行,避免打爆限流)
        for (let i = 0; i < drafts.length; i++) {
          const draft = drafts[i];
          await updateJobProgress(jobId, { done: i, total: drafts.length, phase: "review" });
          const refined = await reviewAndRefine(
            ctx,
            outline.angle.title,
            hookText,
            sections,
            draft.segments,
            draft.cards,
            summaries,
            2,
            async (round) => {
              await updateJobProgress(jobId, { round });
            },
            editPrefs
          );
          await prisma.script.create({
            data: {
              outlineId: id,
              hookText,
              segments: JSON.stringify(refined.segments),
              cards: JSON.stringify(refined.cards),
              status: "draft",
              reviews: {
                create: refined.reviews.map((r, idx) => ({
                  dimensions: JSON.stringify(r.dimensions),
                  findings: JSON.stringify(r.findings),
                  avgScore: r.avgScore,
                  passed: r.passed,
                  attempt: idx,
                })),
              },
            },
          });
          await updateJobProgress(jobId, { done: i + 1, total: drafts.length });
        }
      }
    );
    return NextResponse.json({ jobId });
  } catch (e) {
    return handleError(e);
  }
}

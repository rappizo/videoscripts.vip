import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MASTER_UID, ownsProject, sessionUid } from "@/lib/access";
import { launchJob, updateJobProgress } from "@/lib/jobs";
import { buildProjectContext } from "@/lib/projectContext";
import { generateHooks } from "@/lib/pipeline/hookStage";
import { handleError, missingKeyError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!process.env.AI_API_KEY) return missingKeyError();
  const { id } = await params;
  try {
    const uid = await sessionUid(request);
    const angle = await prisma.angle.findUnique({ where: { id }, include: { project: true } });
    if (!angle || !ownsProject(uid, angle.project.userId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const jobId = await launchJob(
      { projectId: angle.projectId, stage: "hooks", userId: uid && uid !== MASTER_UID ? uid : null },
      async (jobId) => {
        const ctx = await buildProjectContext(angle.projectId);
        const candidates = await generateHooks(
          ctx,
          { title: angle.title, premise: angle.premise },
          Number(process.env.HOOK_COUNT || 12),
          async (done, total) => {
            await updateJobProgress(jobId, { done, total });
          }
        );
        for (const c of candidates) {
          await prisma.hook.create({
            data: {
              angleId: id,
              text: c.text,
              hookType: c.hookType,
              scores: JSON.stringify(c.scores),
              total: c.total,
            },
          });
        }
      }
    );
    return NextResponse.json({ jobId });
  } catch (e) {
    return handleError(e);
  }
}

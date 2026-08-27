import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MASTER_UID, ownsProject, sessionUid } from "@/lib/access";
import { launchJob } from "@/lib/jobs";
import { buildProjectContext } from "@/lib/projectContext";
import { generateSingleHook } from "@/lib/pipeline/hookStage";
import { handleError, missingKeyError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

// 单条钩子换一条:重新生成并替换该钩子(不替换其它钩子)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!process.env.AI_API_KEY) return missingKeyError();
  const { id } = await params;
  try {
    const uid = await sessionUid(request);
    const hook = await prisma.hook.findUnique({
      where: { id },
      include: { angle: { include: { project: true } } },
    });
    if (!hook || !ownsProject(uid, hook.angle.project.userId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const jobId = await launchJob(
      { projectId: hook.angle.projectId, stage: "hooks", userId: uid && uid !== MASTER_UID ? uid : null },
      async () => {
        const ctx = await buildProjectContext(hook.angle.projectId);
        const candidate = await generateSingleHook(ctx, {
          title: hook.angle.title,
          premise: hook.angle.premise,
        });
        await prisma.hook.update({
          where: { id },
          data: {
            text: candidate.text,
            hookType: candidate.hookType,
            scores: JSON.stringify(candidate.scores),
            total: candidate.total,
          },
        });
      }
    );
    return NextResponse.json({ jobId });
  } catch (e) {
    return handleError(e);
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MASTER_UID, ownsProject, sessionUid } from "@/lib/access";
import { launchJob } from "@/lib/jobs";
import { buildProjectContext } from "@/lib/projectContext";
import { generateAngle } from "@/lib/pipeline/angleStage";
import { handleError, missingKeyError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

// 单个角度换一条:重新生成内容并替换该角度(同时清除其旧钩子,避免与新前提不一致)
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
      { projectId: angle.projectId, stage: "angles", userId: uid && uid !== MASTER_UID ? uid : null },
      async () => {
        const ctx = await buildProjectContext(angle.projectId);
        const candidate = await generateAngle(ctx);
        await prisma.hook.deleteMany({ where: { angleId: id } });
        await prisma.angle.update({
          where: { id },
          data: {
            title: candidate.title,
            premise: candidate.premise,
            whyItWorks: candidate.whyItWorks ?? "",
            explanationZh: candidate.explanationZh ?? "",
            cards: JSON.stringify(candidate.cards),
          },
        });
      }
    );
    return NextResponse.json({ jobId });
  } catch (e) {
    return handleError(e);
  }
}

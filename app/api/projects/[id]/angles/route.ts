import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MASTER_UID, accessibleProject, sessionUid } from "@/lib/access";
import { launchJob, updateJobProgress } from "@/lib/jobs";
import { buildProjectContext } from "@/lib/projectContext";
import { generateAngle } from "@/lib/pipeline/angleStage";
import { mapLimit } from "@/lib/pipeline/utils";
import { handleError, missingKeyError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!process.env.AI_API_KEY) return missingKeyError();
  const { id } = await params;
  try {
    const uid = await sessionUid(request);
    const project = await accessibleProject(uid, id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const count = Number(process.env.NEXT_PUBLIC_ANGLE_COUNT || 2);
    const jobId = await launchJob(
      { projectId: id, stage: "angles", userId: uid && uid !== MASTER_UID ? uid : null },
      async (jobId) => {
        const ctx = await buildProjectContext(id);
        const candidates = await mapLimit(Array.from({ length: count }), 4, async (_, i) => {
          const candidate = await generateAngle(ctx);
          await updateJobProgress(jobId, { done: i + 1, total: count });
          return candidate;
        });
        for (const c of candidates) {
          await prisma.angle.create({
            data: {
              projectId: id,
              title: c.title,
              premise: c.premise,
              cards: JSON.stringify(c.cards),
              whyItWorks: c.whyItWorks ?? "",
              explanationZh: c.explanationZh ?? "",
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

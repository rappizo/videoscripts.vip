import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { MASTER_UID, ownsProject, sessionUid } from "@/lib/access";
import { launchJob, updateJobProgress } from "@/lib/jobs";
import { buildProjectContext } from "@/lib/projectContext";
import { generateOutline } from "@/lib/pipeline/outlineStage";
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
    const uid = await sessionUid(request);
    const angle = await prisma.angle.findUnique({ where: { id }, include: { project: true } });
    if (!angle || !ownsProject(uid, angle.project.userId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const jobId = await launchJob(
      { projectId: angle.projectId, stage: "outline", userId: uid && uid !== MASTER_UID ? uid : null },
      async (jobId) => {
        const ctx = await buildProjectContext(angle.projectId);
        const result = await generateOutline(
          ctx,
          { title: angle.title, premise: angle.premise },
          parsed.data.hookText,
          async (attempt, total) => {
            await updateJobProgress(jobId, { attempt, total, phase: "outline" });
          }
        );
        await prisma.outline.upsert({
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
        await updateJobProgress(jobId, { coverageOk: result.coverageOk, missing: result.missing });
      }
    );
    return NextResponse.json({ jobId });
  } catch (e) {
    return handleError(e);
  }
}

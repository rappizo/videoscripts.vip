import { NextResponse } from "next/server";
import { MASTER_UID, accessibleProject, sessionUid } from "@/lib/access";
import { launchJob } from "@/lib/jobs";
import { runAutoPilot } from "@/lib/autopilot";
import { handleError, missingKeyError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

// 一键流水线:自动完成 角度 → 钩子 → 大纲 → 脚本,已完成的步骤会跳过
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!process.env.AI_API_KEY) return missingKeyError();
  const { id } = await params;
  try {
    const uid = await sessionUid(request);
    const project = await accessibleProject(uid, id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const jobId = await launchJob(
      { projectId: id, stage: "autopilot", userId: uid && uid !== MASTER_UID ? uid : null },
      (jobId) => runAutoPilot(id, jobId)
    );
    return NextResponse.json({ jobId });
  } catch (e) {
    return handleError(e);
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { MASTER_UID, sessionUid } from "@/lib/access";
import { launchJob, setJobResult, updateJobProgress } from "@/lib/jobs";
import { generateProductBrief } from "@/lib/pipeline/briefStage";
import { mapLimit } from "@/lib/pipeline/utils";
import { handleError, missingKeyError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  category: z.string().min(1).max(50),
  niche: z.string().min(1).max(50),
  productName: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  ref: z.string().max(500).optional(),
  durationSec: z.number().int().min(10).max(180).optional(),
  goal: z.string().max(50).optional(),
});

// 由产品品类 + 产品名生成 N 个完整项目方案(不落库,结果写入任务 result,用户选定后才创建项目)
export async function POST(request: Request) {
  if (!process.env.AI_API_KEY) return missingKeyError();
  try {
    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "category / niche / productName are required" }, { status: 400 });
    }
    const count = Number(process.env.BRIEF_COUNT || 5);
    const uid = await sessionUid(request);
    const jobId = await launchJob(
      { stage: "brief", projectId: null, userId: uid && uid !== MASTER_UID ? uid : null },
      async (jobId) => {
        const briefs = await mapLimit(Array.from({ length: count }), 4, async (_, i) => {
          const brief = await generateProductBrief({
            category: parsed.data.category,
            niche: parsed.data.niche,
            productName: parsed.data.productName,
            description: parsed.data.description,
            ref: parsed.data.ref,
            durationSec: parsed.data.durationSec,
            goal: parsed.data.goal,
          });
          await updateJobProgress(jobId, { done: i + 1, total: count });
          return brief;
        });
        await setJobResult(jobId, { briefs });
      }
    );
    return NextResponse.json({ jobId });
  } catch (e) {
    return handleError(e);
  }
}

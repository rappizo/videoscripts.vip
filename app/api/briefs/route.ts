import { NextResponse } from "next/server";
import { z } from "zod";
import { generateProductBrief } from "@/lib/pipeline/briefStage";
import { mapLimit } from "@/lib/pipeline/utils";
import { handleError, missingKeyError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  category: z.string().min(1).max(50),
  niche: z.string().min(1).max(50),
  productName: z.string().min(1).max(100),
});

// 由产品品类 + 产品名生成 N 个完整项目方案(不落库,用户选定后才创建项目)
export async function POST(request: Request) {
  if (!process.env.AI_API_KEY) return missingKeyError();
  try {
    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "category / niche / productName are required" }, { status: 400 });
    }
    const count = Number(process.env.BRIEF_COUNT || 5);
    const briefs = await mapLimit(Array.from({ length: count }), 4, () =>
      generateProductBrief(parsed.data)
    );
    return NextResponse.json({ briefs });
  } catch (e) {
    return handleError(e);
  }
}

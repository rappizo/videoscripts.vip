import { NextResponse } from "next/server";
import OpenAI from "openai";
import { handleError, missingKeyError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

// 诊断端点:确认 apiyi 可用模型名(配置前先验证)
export async function GET() {
  if (!process.env.AI_API_KEY) return missingKeyError();
  try {
    const client = new OpenAI({
      apiKey: process.env.AI_API_KEY,
      baseURL: process.env.AI_BASE_URL || "https://api.apiyi.com/v1",
    });
    const res = await client.models.list();
    const names = res.data.map((m) => m.id).sort();
    const claude = names.filter((n) => n.toLowerCase().includes("claude"));
    return NextResponse.json({ total: names.length, claudeModels: claude, all: names.slice(0, 100) });
  } catch (e) {
    return handleError(e);
  }
}

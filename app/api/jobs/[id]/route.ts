import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ownsProject, sessionUid } from "@/lib/access";
import { serializeJob } from "@/lib/serializers";

export const dynamic = "force-dynamic";

// 查询任务状态与进度
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await sessionUid(request);
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job || !ownsProject(uid, job.userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(serializeJob(job));
}

// 取消任务:标记 cancelled,运行中的工作会在下一次 LLM 调用前中止
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await sessionUid(request);
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job || !ownsProject(uid, job.userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const terminal = new Set(["succeeded", "failed", "cancelled"]);
  if (!terminal.has(job.status)) {
    await prisma.job.update({ where: { id }, data: { status: "cancelled" } });
  }
  return NextResponse.json({ ok: true });
}

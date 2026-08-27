import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ownsProject, sessionUid } from "@/lib/access";
import { serializeReview, serializeScript } from "@/lib/serializers";
import { handleError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

const segmentSchema = z.object({
  time: z.string().max(50),
  voiceover: z.string().max(2000),
  visual: z.string().max(1000),
  onscreenText: z.string().max(300),
});

const patchSchema = z.object({
  segments: z.array(segmentSchema).min(1).max(30),
});

// 脚本归属项目 userId 的只读查询(避免把关系对象序列化进响应)
async function scriptOwner(scriptId: string) {
  return prisma.script.findUnique({
    where: { id: scriptId },
    select: { outline: { select: { angle: { select: { project: { select: { userId: true } } } } } } },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await sessionUid(request);
  const owner = await scriptOwner(id);
  if (!owner || !ownsProject(uid, owner.outline.angle.project.userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const script = await prisma.script.findUnique({
    where: { id },
    include: { reviews: { orderBy: { createdAt: "asc" } }, editLogs: { orderBy: { createdAt: "asc" } } },
  });
  if (!script) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { reviews, editLogs, ...rest } = script;
  return NextResponse.json({
    ...serializeScript(rest),
    reviews: reviews.map(serializeReview),
    editLogs,
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const uid = await sessionUid(request);
    const owner = await scriptOwner(id);
    if (!owner || !ownsProject(uid, owner.outline.angle.project.userId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const existing = await prisma.script.findUniqueOrThrow({ where: { id } });
    const oldSegments = JSON.parse(existing.segments) as {
      time: string;
      voiceover: string;
      visual: string;
      onscreenText: string;
    }[];

    // 逐段比对,记录修改(微调数据飞轮)
    const editLogs = [];
    for (let i = 0; i < Math.max(oldSegments.length, parsed.data.segments.length); i++) {
      const oldSeg = oldSegments[i];
      const newSeg = parsed.data.segments[i];
      if (!oldSeg || !newSeg) continue;
      for (const field of ["voiceover", "visual", "onscreenText"] as const) {
        const before = oldSeg[field] ?? "";
        const after = newSeg[field] ?? "";
        if (before !== after && after.trim()) {
          editLogs.push({ field: `segment:${i}:${field}`, before, after });
        }
      }
    }

    const script = await prisma.script.update({
      where: { id },
      data: {
        segments: JSON.stringify(parsed.data.segments),
        status: "edited",
        editLogs: { create: editLogs },
      },
      include: { reviews: { orderBy: { createdAt: "asc" } } },
    });
    return NextResponse.json({
      ...serializeScript(script),
      reviews: script.reviews.map(serializeReview),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await sessionUid(request);
  const owner = await scriptOwner(id);
  if (!owner || !ownsProject(uid, owner.outline.angle.project.userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.script.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

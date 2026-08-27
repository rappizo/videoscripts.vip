import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ownsProject, projectScope, sessionUid } from "@/lib/access";
import { serializeAngle, serializeHook, serializeOutline, serializeReview, serializeScript } from "@/lib/serializers";
import { handleError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

const materialSchema = z.object({
  type: z.enum(["fact", "data", "quote", "feature", "keyword", "story"]),
  content: z.string().min(1).max(2000),
  isRequired: z.boolean().default(true),
});

const patchSchema = z.object({
  topic: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  niche: z.string().max(100).optional(),
  productCategory: z.string().max(100).optional(),
  productName: z.string().max(200).optional(),
  brief: z.string().max(500).optional(),
  audience: z.string().max(200).optional(),
  platform: z.string().max(50).optional(),
  durationSec: z.number().int().min(10).max(180).optional(),
  language: z.string().max(50).optional(),
  style: z.string().max(300).optional(),
  goal: z.string().max(300).optional(),
  status: z.enum(["draft", "active"]).optional(),
  materials: z.array(materialSchema).max(30).optional(),
  starred: z.boolean().optional(),
  archived: z.boolean().optional(),
});

// 编辑项目元信息 / 置顶 / 归档

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const uid = await sessionUid(request);
    const existing = await prisma.project.findFirst({ where: { id, ...projectScope(uid) } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { archived, materials, ...fields } = parsed.data;
    const data: Record<string, unknown> = { ...fields };
    if (archived !== undefined) data.archivedAt = archived ? new Date() : null;
    const project = await prisma.project.update({ where: { id }, data });
    if (materials) {
      await prisma.material.deleteMany({ where: { projectId: id } });
      await prisma.material.createMany({
        data: materials.map((m) => ({ projectId: id, type: m.type, content: m.content, isRequired: m.isRequired })),
      });
    }
    return NextResponse.json({ ok: true, archivedAt: project.archivedAt, starred: project.starred });
  } catch (e) {
    return handleError(e);
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await sessionUid(request);
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      materials: true,
      angles: {
        orderBy: { createdAt: "asc" },
        include: {
          hooks: { orderBy: [{ selected: "desc" }, { total: "desc" }] },
          outline: { include: { scripts: { orderBy: { createdAt: "asc" }, include: { reviews: { orderBy: { createdAt: "asc" } } } } } },
        },
      },
    },
  });
  if (!project || !ownsProject(uid, project.userId))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stats = await prisma.job.aggregate({
    where: { projectId: id, status: "succeeded" },
    _sum: { tokensIn: true, tokensOut: true, costUsd: true },
    _count: true,
  });

  const { angles, ...rest } = project;
  return NextResponse.json({
    ...rest,
    stats: {
      jobCount: stats._count,
      tokensIn: stats._sum.tokensIn ?? 0,
      tokensOut: stats._sum.tokensOut ?? 0,
      costUsd: stats._sum.costUsd ?? 0,
    },
    angles: angles.map((a) => ({
      ...serializeAngle(a),
      hooks: a.hooks.map(serializeHook),
      outline: a.outline
        ? {
            ...serializeOutline(a.outline),
            scripts: a.outline.scripts.map((s) => ({
              ...serializeScript(s),
              reviews: s.reviews.map(serializeReview),
            })),
          }
        : null,
    })),
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await sessionUid(request);
  const project = await prisma.project.findFirst({ where: { id, ...projectScope(uid) } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

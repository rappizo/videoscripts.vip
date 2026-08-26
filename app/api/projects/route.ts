import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const materialSchema = z.object({
  type: z.enum(["fact", "data", "quote", "feature", "keyword", "story"]),
  content: z.string().min(1).max(2000),
  isRequired: z.boolean().default(true),
});

const createSchema = z.object({
  topic: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  niche: z.string().max(100).default(""),
  audience: z.string().max(200).default(""),
  platform: z.string().max(50).default("tiktok"),
  durationSec: z.number().int().min(10).max(180).default(30),
  language: z.string().max(50).default("English"),
  style: z.string().max(300).default(""),
  goal: z.string().max(300).default(""),
  materials: z.array(materialSchema).max(30).default([]),
});

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { angles: true, materials: true } },
      angles: { include: { _count: { select: { hooks: true } }, outline: true } },
    },
  });
  return NextResponse.json(
    projects.map((p) => ({
      id: p.id,
      topic: p.topic,
      niche: p.niche,
      audience: p.audience,
      durationSec: p.durationSec,
      createdAt: p.createdAt,
      materialCount: p._count.materials,
      angleCount: p._count.angles,
      selectedAngle: p.angles.find((a) => a.status === "selected")?.title ?? null,
      hasOutline: p.angles.some((a) => a.outline?.status === "locked"),
      scriptCount: p.angles.reduce((acc, a) => acc + (a.outline ? 0 : 0), 0),
    }))
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const d = parsed.data;
  const project = await prisma.project.create({
    data: {
      topic: d.topic,
      description: d.description,
      niche: d.niche,
      audience: d.audience,
      platform: d.platform,
      durationSec: d.durationSec,
      language: d.language,
      style: d.style,
      goal: d.goal,
      materials: {
        create: d.materials.map((m) => ({
          type: m.type,
          content: m.content,
          isRequired: m.isRequired,
        })),
      },
    },
  });
  return NextResponse.json({ id: project.id });
}

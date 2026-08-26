import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeAngle, serializeHook, serializeOutline, serializeReview, serializeScript } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { angles, ...rest } = project;
  return NextResponse.json({
    ...rest,
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

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

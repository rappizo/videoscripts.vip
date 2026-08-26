import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { serializeOutline } from "@/lib/serializers";
import { handleError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

const sectionSchema = z.object({
  timeRange: z.string().max(50),
  beat: z.string().max(100),
  summary: z.string().max(500),
  direction: z.string().max(500),
  materialRefs: z.array(z.string()).default([]),
});

const patchSchema = z.object({
  sections: z.array(sectionSchema).min(1).max(12).optional(),
  status: z.enum(["draft", "locked"]).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const data: { sections?: string; status?: string } = {};
    if (parsed.data.sections) data.sections = JSON.stringify(parsed.data.sections);
    if (parsed.data.status) data.status = parsed.data.status;
    const outline = await prisma.outline.update({ where: { id }, data });
    return NextResponse.json({ outline: serializeOutline(outline) });
  } catch (e) {
    return handleError(e);
  }
}

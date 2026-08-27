import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ownsProject, sessionUid } from "@/lib/access";
import { serializeHook } from "@/lib/serializers";
import { handleError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  selected: z.boolean().optional(),
  text: z.string().min(1).max(300).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success || (!parsed.data.selected && parsed.data.text === undefined)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const uid = await sessionUid(request);
    const hook = await prisma.hook.findUnique({
      where: { id },
      include: { angle: { include: { project: true } } },
    });
    if (!hook || !ownsProject(uid, hook.angle.project.userId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (parsed.data.selected) {
      await prisma.hook.updateMany({
        where: { angleId: hook.angleId, selected: true },
        data: { selected: false },
      });
    }
    const data: { selected?: boolean; text?: string } = {};
    if (parsed.data.selected !== undefined) data.selected = parsed.data.selected;
    if (parsed.data.text !== undefined) data.text = parsed.data.text;
    const updated = await prisma.hook.update({
      where: { id },
      data,
    });
    return NextResponse.json({ hook: serializeHook(updated) });
  } catch (e) {
    return handleError(e);
  }
}

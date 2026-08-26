import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { serializeHook } from "@/lib/serializers";
import { handleError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  selected: z.boolean(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const hook = await prisma.hook.findUniqueOrThrow({ where: { id } });
    if (parsed.data.selected) {
      await prisma.hook.updateMany({
        where: { angleId: hook.angleId, selected: true },
        data: { selected: false },
      });
    }
    const updated = await prisma.hook.update({
      where: { id },
      data: { selected: parsed.data.selected },
    });
    return NextResponse.json({ hook: serializeHook(updated) });
  } catch (e) {
    return handleError(e);
  }
}

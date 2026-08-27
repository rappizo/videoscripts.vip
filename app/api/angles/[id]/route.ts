import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ownsProject, sessionUid } from "@/lib/access";
import { serializeAngle } from "@/lib/serializers";
import { handleError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["selected", "rejected", "draft"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

    const uid = await sessionUid(request);
    const angle = await prisma.angle.findUnique({ where: { id }, include: { project: true } });
    if (!angle || !ownsProject(uid, angle.project.userId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (parsed.data.status === "selected") {
      // 同一项目下只保留一个选中角度
      await prisma.angle.updateMany({
        where: { projectId: angle.projectId, status: "selected" },
        data: { status: "draft" },
      });
    }
    const updated = await prisma.angle.update({
      where: { id },
      data: { status: parsed.data.status },
    });
    return NextResponse.json({ angle: serializeAngle(updated) });
  } catch (e) {
    return handleError(e);
  }
}

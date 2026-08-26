import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildProjectContext } from "@/lib/projectContext";
import { generateAngle } from "@/lib/pipeline/angleStage";
import { mapLimit } from "@/lib/pipeline/utils";
import { serializeAngle } from "@/lib/serializers";
import { handleError, missingKeyError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!process.env.AI_API_KEY) return missingKeyError();
  const { id } = await params;
  try {
    const ctx = await buildProjectContext(id);
    const count = Number(process.env.NEXT_PUBLIC_ANGLE_COUNT || 5);
    const candidates = await mapLimit(Array.from({ length: count }), 4, () => generateAngle(ctx));
    const created = [];
    for (const c of candidates) {
      const angle = await prisma.angle.create({
        data: {
          projectId: id,
          title: c.title,
          premise: c.premise,
          cards: JSON.stringify(c.cards),
          whyItWorks: c.whyItWorks ?? "",
        },
      });
      created.push(serializeAngle(angle));
    }
    return NextResponse.json({ angles: created });
  } catch (e) {
    return handleError(e);
  }
}

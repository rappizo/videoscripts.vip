import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { MASTER_UID, ownsProject, sessionUid } from "@/lib/access";
import { scriptToText } from "@/lib/scriptExport";
import { serializeCase } from "@/lib/serializers";
import { seedCasesIfEmpty } from "@/lib/cases";
import { handleError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

export async function GET() {
  await seedCasesIfEmpty();
  const cases = await prisma.case.findMany({ orderBy: [{ category: "asc" }, { createdAt: "asc" }] });
  return NextResponse.json({ cases: cases.map(serializeCase) });
}

const collectSchema = z.object({
  scriptId: z.string().min(1),
});

// 收藏脚本到案例库(沉淀为自有语料,后续 few-shot 引用)
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = collectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "scriptId is required" }, { status: 400 });
    }
    const uid = await sessionUid(request);
    const script = await prisma.script.findUnique({
      where: { id: parsed.data.scriptId },
      include: { outline: { include: { angle: { include: { project: true } } } } },
    });
    if (!script || !ownsProject(uid, script.outline.angle.project.userId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (script.status === "approved") {
      return NextResponse.json({ error: "该脚本已收藏过" }, { status: 409 });
    }
    const cards = JSON.parse(script.cards) as {
      structureName?: string;
      personaName?: string;
      emotionArc?: string;
    };
    const content = scriptToText(script.hookText, JSON.parse(script.segments));
    const tags = {
      niche: script.outline.angle.project.niche || "",
      emotion: cards.emotionArc ?? "",
      structure: cards.structureName ?? "",
      persona: cards.personaName ?? "",
    };
    const created = await prisma.case.create({
      data: {
        userId: uid && uid !== MASTER_UID ? uid : null,
        category: "script",
        content,
        tags: JSON.stringify(tags),
      },
    });
    await prisma.script.update({ where: { id: script.id }, data: { status: "approved" } });
    return NextResponse.json({ ok: true, case: serializeCase(created) });
  } catch (e) {
    return handleError(e);
  }
}

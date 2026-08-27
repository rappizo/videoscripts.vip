import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ownsProject, sessionUid } from "@/lib/access";
import { buildScriptExport } from "@/lib/scriptExport";

export const dynamic = "force-dynamic";

// 导出脚本文件:GET /api/scripts/[id]/export?format=txt|srt|md
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await sessionUid(request);
  const owner = await prisma.script.findUnique({
    where: { id },
    select: { outline: { select: { angle: { select: { project: { select: { userId: true } } } } } } },
  });
  if (!owner || !ownsProject(uid, owner.outline.angle.project.userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const script = await prisma.script.findUnique({ where: { id } });
  if (!script) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const format = new URL(request.url).searchParams.get("format") ?? "txt";
  const segments = JSON.parse(script.segments);
  const { content, ext } = buildScriptExport(format, script.hookText, segments);
  const filename = `script-${script.id.slice(-6)}.${ext}`;
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

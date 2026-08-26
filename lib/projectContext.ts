// 项目上下文构建 + 历史脚本摘要(用于相似度去重)
import { prisma } from "./db";
import type { ProjectContext } from "./pipeline/types";

export async function buildProjectContext(projectId: string): Promise<ProjectContext> {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { materials: true },
  });
  return {
    id: project.id,
    topic: project.topic,
    description: project.description,
    niche: project.niche,
    audience: project.audience,
    durationSec: project.durationSec,
    style: project.style,
    goal: project.goal,
    materials: project.materials.map((m) => ({
      id: m.id,
      type: m.type,
      content: m.content,
      isRequired: m.isRequired,
    })),
  };
}

export async function previousScriptSummaries(outlineId: string): Promise<string> {
  const scripts = await prisma.script.findMany({
    where: { outlineId },
    orderBy: { createdAt: "asc" },
  });
  if (!scripts.length) return "";
  return scripts
    .map((s) => {
      try {
        const segs = JSON.parse(s.segments) as { voiceover?: string }[];
        return `- "${segs[0]?.voiceover ?? ""}" (id ${s.id.slice(-4)})`;
      } catch {
        return "";
      }
    })
    .filter(Boolean)
    .join("\n");
}

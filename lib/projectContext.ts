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

// 归纳同项目历史人工修改为"编辑偏好清单",注入后续生成/评审(微调数据飞轮)
export async function buildEditPreferences(projectId: string): Promise<string> {
  const logs = await prisma.editLog.findMany({
    where: { script: { outline: { angle: { projectId } } } },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  if (!logs.length) return "";
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const log of logs) {
    const key = `${log.field}:${log.after}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(`- ${log.field}: "${log.before.slice(0, 80)}" → "${log.after.slice(0, 120)}"`);
    if (lines.length >= 20) break;
  }
  return `The editor has previously made these manual changes to scripts in this project — internalize this taste and avoid repeating the "before" style:
${lines.join("\n")}`;
}

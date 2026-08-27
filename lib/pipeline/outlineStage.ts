// 阶段 3:大纲锁定 — 强制标注素材引用点,必填素材未覆盖自动重写(≤2 轮)
import { completeJson } from "../ai/client";
import { banlistText, fillTemplate, formatMaterials, loadSystem } from "./assets";
import { checkMaterialCoverage } from "./verifiers";
import type { AngleInfo, OutlineSection, ProjectContext } from "./types";

export async function generateOutline(
  ctx: ProjectContext,
  angle: AngleInfo,
  hookText: string,
  onProgress?: (attempt: number, total: number) => void | Promise<void>
): Promise<{ sections: OutlineSection[]; coverageOk: boolean; missing: string[] }> {
  const requiredIds = ctx.materials.filter((m) => m.isRequired).map((m) => m.id);
  const vars = {
    TOPIC: ctx.topic,
    ANGLE: `${angle.title} — ${angle.premise}`,
    HOOK: hookText,
    AUDIENCE: ctx.audience || "general audience",
    DURATION: String(ctx.durationSec),
    GOAL: ctx.goal || "not specified",
    MATERIALS: formatMaterials(ctx.materials),
    BANLIST: banlistText(),
  };

  let sections: OutlineSection[] = [];
  let lastMissing: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    await onProgress?.(attempt, 2);
    const system = fillTemplate(loadSystem("outline"), vars);
    const user =
      attempt === 1
        ? "Produce the outline now."
        : `Your previous outline did not reference these required materials: ${lastMissing.join(", ")}. Rewrite the outline so EVERY required material appears in a beat's materialRefs. Do not drop any material.`;
    const res = await completeJson<{ sections: OutlineSection[] }>({
      system,
      user,
      temperature: 0.7,
      maxTokens: 1600,
    });
    sections = res.sections ?? [];
    const check = checkMaterialCoverage(sections, requiredIds);
    if (check.covered) {
      return { sections, coverageOk: true, missing: [] };
    }
    lastMissing = check.missing;
  }
  return { sections, coverageOk: false, missing: lastMissing };
}

// 阶段 2:钩子工厂 — 从公式库随机抽槽位生成,再用 critic 评分排序
import { completeJson, getModel } from "../ai/client";
import { banlistText, fillTemplate, loadJson, loadSystem } from "./assets";
import { mapLimit, shuffle } from "./utils";
import type { AngleInfo, HookCandidate, HookScores, ProjectContext } from "./types";

interface HooksCatalogShape {
  categories: { type: string; label: string; templates: string[] }[];
}

interface ScoreResult {
  results: {
    index: number;
    specificity: number;
    curiosityGap: number;
    promiseClarity: number;
    first3seconds: number;
    contentFit: number;
    reason: string;
  }[];
}

export async function generateHooks(
  ctx: ProjectContext,
  angle: AngleInfo,
  count = 12
): Promise<HookCandidate[]> {
  const catalog = loadJson<HooksCatalogShape>("hooks.json");
  const slots = catalog.categories.flatMap((cat) =>
    cat.templates.map((t) => ({ type: cat.type, label: cat.label, template: t }))
  );
  const picked = shuffle(slots).slice(0, count);

  const concurrency = Number(process.env.AI_CONCURRENCY || 4);
  const generated = await mapLimit(picked, concurrency, async (slot) => {
    const system = fillTemplate(loadSystem("hook"), {
      HOOK_TYPE: slot.type,
      HOOK_LABEL: slot.label,
      HOOK_TEMPLATE: slot.template,
      TOPIC: ctx.topic,
      ANGLE: `${angle.title} — ${angle.premise}`,
      AUDIENCE: ctx.audience || "general audience",
      DURATION: String(ctx.durationSec),
      MATERIALS: ctx.materials.map((m) => m.content).join(" | "),
      BANLIST: banlistText(),
    });
    const res = await completeJson<{ text: string }>({
      system,
      user: `Write the hook for angle: ${angle.title}`,
      temperature: 1.0,
      maxTokens: 200,
    });
    return { text: res.text.trim(), hookType: slot.type, label: slot.label, template: slot.template };
  });

  const scoreSystem = fillTemplate(loadSystem("hookScore"), {
    TOPIC: ctx.topic,
    ANGLE: `${angle.title} — ${angle.premise}`,
    AUDIENCE: ctx.audience || "general audience",
    HOOKS: generated.map((h, i) => `#${i}: ${h.text}`).join("\n"),
  });
  const scored = await completeJson<ScoreResult>({
    system: scoreSystem,
    user: "Score all hooks now.",
    model: getModel("critic"),
    temperature: 0.2,
    maxTokens: 2500,
  });

  const merged: HookCandidate[] = generated.map((h, i) => {
    const s = scored.results.find((r) => r.index === i);
    const scores: HookScores = s
      ? {
          specificity: s.specificity,
          curiosityGap: s.curiosityGap,
          promiseClarity: s.promiseClarity,
          first3seconds: s.first3seconds,
          contentFit: s.contentFit,
        }
      : {};
    const total = s
      ? (s.specificity + s.curiosityGap + s.promiseClarity + s.first3seconds + s.contentFit) / 5
      : 0;
    return { ...h, scores, total: Math.round(total * 10) / 10, reason: s?.reason ?? "" };
  });
  return merged.sort((a, b) => b.total - a.total);
}

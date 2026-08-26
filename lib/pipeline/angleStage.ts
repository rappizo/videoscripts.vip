// 阶段 1:角度发散 — 每个候选抽一张随机创意牌
import { completeJson } from "../ai/client";
import { banlistText, fillTemplate, formatMaterials, loadSystem } from "./assets";
import { cardsToPrompt, drawCards } from "./creativity";
import { getCasesFor } from "../cases";
import type { AngleCandidate, CreativeCards, ProjectContext } from "./types";

export async function generateAngle(
  ctx: ProjectContext
): Promise<AngleCandidate & { cards: CreativeCards }> {
  const cards = drawCards();
  const cases = await getCasesFor("hook", ctx.niche, 4);
  const system = fillTemplate(loadSystem("angle"), {
    TOPIC: ctx.topic,
    DESCRIPTION: ctx.description || "-",
    NICHE: ctx.niche || "-",
    AUDIENCE: ctx.audience || "general audience",
    DURATION: String(ctx.durationSec),
    STYLE: ctx.style || "not specified",
    GOAL: ctx.goal || "not specified",
    MATERIALS: formatMaterials(ctx.materials),
    CARDS: cardsToPrompt(cards),
    BANLIST: banlistText(),
    CASES: cases,
  });
  const result = await completeJson<AngleCandidate>({
    system,
    user: `Topic: ${ctx.topic}\n\nGenerate the angle now.`,
    temperature: 0.9,
    maxTokens: 700,
  });
  return { ...result, cards };
}

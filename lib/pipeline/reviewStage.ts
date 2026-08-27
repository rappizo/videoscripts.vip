// 阶段 5:评审与改写 — rubric 六维评分 + 规则双检(黑名单/素材),不达标定向重写(≤2 轮)
import { completeJson, getModel } from "../ai/client";
import {
  banlistText,
  fillTemplate,
  formatScript,
  loadSystem,
  requiredMaterialLines,
  rubricText,
  rubricThresholds,
} from "./assets";
import { findBanlistHits } from "./verifiers";
import { generateScript } from "./scriptStage";
import type {
  CreativeCards,
  OutlineSection,
  ProjectContext,
  ReviewResult,
  ScriptSegment,
} from "./types";

export async function reviewScript(
  ctx: ProjectContext,
  angleTitle: string,
  hookText: string,
  segments: ScriptSegment[],
  previousSummaries: string,
  editPrefs = ""
): Promise<ReviewResult> {
  const thresholds = rubricThresholds();
  const system = fillTemplate(loadSystem("review"), {
    TOPIC: ctx.topic,
    ANGLE: angleTitle,
    HOOK: hookText,
    DURATION: String(ctx.durationSec),
    MATERIALS: requiredMaterialLines(ctx.materials),
    PREVIOUS: previousSummaries || "(no previous scripts in this project)",
    EDIT_PREFS: editPrefs || "(none yet — no manual edits recorded in this project)",
    SCRIPT: formatScript(segments),
    BANLIST: banlistText(),
    RUBRIC: rubricText(),
    PASS_AVG: String(thresholds.passAvg),
    PASS_HOOK: String(thresholds.passHook),
  });
  const res = await completeJson<ReviewResult>({
    system,
    user: "Review the script now.",
    model: getModel("critic"),
    temperature: 0.2,
    maxTokens: 2200,
  });

  // 规则层双检:黑名单直接判不通过
  const fullText = segments.map((s) => `${s.voiceover} ${s.onscreenText}`).join(" ");
  const ruleHits = findBanlistHits(fullText);
  if (ruleHits.length) {
    res.findings = [
      ...(res.findings ?? []),
      `critical: banned cliche phrase(s) detected: ${ruleHits.join(", ")}`,
    ];
    res.passed = false;
  }
  const dims = Object.values(res.dimensions ?? {});
  res.avgScore = dims.length
    ? Math.round((dims.reduce((a, d) => a + d.score, 0) / dims.length) * 10) / 10
    : 0;
  return res;
}

export async function reviewAndRefine(
  ctx: ProjectContext,
  angleTitle: string,
  hookText: string,
  outline: OutlineSection[],
  initialSegments: ScriptSegment[],
  cards: CreativeCards,
  previousSummaries: string,
  maxRounds = 2,
  onProgress?: (round: number) => void | Promise<void>,
  editPrefs = ""
): Promise<{
  segments: ScriptSegment[];
  cards: CreativeCards;
  reviews: ReviewResult[];
  passed: boolean;
}> {
  const reviews: ReviewResult[] = [];
  let segments = initialSegments;
  let currentCards = cards;

  let review = await reviewScript(ctx, angleTitle, hookText, segments, previousSummaries, editPrefs);
  reviews.push(review);
  await onProgress?.(reviews.length);

  for (let round = 0; round < maxRounds && !review.passed; round++) {
    const notes = review.findings
      .map((f) => `- ${f}`)
      .join("\n");
    const rewritten = await generateScript(ctx, angleTitle, hookText, outline, notes, editPrefs);
    segments = rewritten.segments;
    currentCards = rewritten.cards;
    review = await reviewScript(ctx, angleTitle, hookText, segments, previousSummaries, editPrefs);
    reviews.push(review);
    await onProgress?.(reviews.length);
  }

  return { segments, cards: currentCards, reviews, passed: review.passed };
}

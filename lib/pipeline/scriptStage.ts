// 阶段 4:分镜正文 — 只喂锁定大纲(不带原始素材,防漂移),逐秒输出
import { completeJson } from "../ai/client";
import { banlistText, fillTemplate, formatOutline, loadSystem } from "./assets";
import { cardsToPrompt, drawCards } from "./creativity";
import type { CreativeCards, OutlineSection, ProjectContext, ScriptSegment } from "./types";

export async function generateScript(
  ctx: ProjectContext,
  angleTitle: string,
  hookText: string,
  outline: OutlineSection[],
  revisionNotes = "",
  editPrefs = ""
): Promise<{ segments: ScriptSegment[]; cards: CreativeCards }> {
  const cards = drawCards();
  const system = fillTemplate(loadSystem("script"), {
    TOPIC: ctx.topic,
    ANGLE: angleTitle,
    HOOK: hookText,
    DURATION: String(ctx.durationSec),
    AUDIENCE: ctx.audience || "general audience",
    OUTLINE: formatOutline(outline),
    CARDS: cardsToPrompt(cards),
    EDIT_PREFS: editPrefs || "(none yet — no manual edits recorded in this project)",
    BANLIST: banlistText(),
  });
  const user = revisionNotes
    ? `Write the full script. REVISION NOTES from the creative director — fix ALL of these in this draft:\n${revisionNotes}`
    : "Write the full script now.";
  const res = await completeJson<{ segments: ScriptSegment[] }>({
    system,
    user,
    temperature: 0.8,
    maxTokens: 2600,
  });
  return { segments: res.segments ?? [], cards };
}

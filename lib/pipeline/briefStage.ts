// 阶段 0:产品简报生成 — 由品类 + 产品名自动产出完整项目方案
import { completeJson } from "../ai/client";
import { banlistText, fillTemplate, loadSystem } from "./assets";
import { cardsToPrompt, drawCards } from "./creativity";
import { getCasesFor } from "../cases";
import type { CreativeCards } from "./types";

export interface ProductBrief {
  title: string;
  hookPreview: string;
  description: string;
  audience: string;
  style: string;
  goal: string;
  materials: { type: string; content: string; isRequired: boolean }[];
}

export async function generateProductBrief(opts: {
  category: string;
  niche: string;
  productName: string;
}): Promise<ProductBrief & { cards: CreativeCards }> {
  const cards = drawCards();
  const cases = await getCasesFor("hook", opts.niche, 4);
  const system = fillTemplate(loadSystem("brief"), {
    CATEGORY: opts.category,
    PRODUCT: opts.productName,
    CARDS: cardsToPrompt(cards),
    BANLIST: banlistText(),
    CASES: cases,
  });
  const res = await completeJson<ProductBrief>({
    system,
    user: `Product: ${opts.productName} (${opts.category}). Generate the project brief now.`,
    temperature: 0.9,
    maxTokens: 1600,
  });
  return { ...res, cards };
}

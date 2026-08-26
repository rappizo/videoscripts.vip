// 规则层校验:反套路黑名单检测 + 素材引用覆盖检查(不依赖模型)
import { loadJson } from "./assets";
import type { OutlineSection } from "./types";

interface BanlistShape {
  phrases: string[];
  patterns: string[];
}

export function findBanlistHits(text: string): string[] {
  const lower = text.toLowerCase();
  const ban = loadJson<BanlistShape>("banlist.json");
  const hits: string[] = [];
  for (const p of ban.phrases) {
    if (lower.includes(p)) hits.push(`"${p}"`);
  }
  for (const re of ban.patterns) {
    try {
      if (new RegExp(re, "i").test(text)) hits.push(`pattern: ${re}`);
    } catch {
      // skip invalid regex
    }
  }
  return hits;
}

export function checkMaterialCoverage(
  sections: OutlineSection[],
  requiredIds: string[]
): { covered: boolean; missing: string[] } {
  const used = new Set(sections.flatMap((s) => s.materialRefs ?? []));
  const missing = requiredIds.filter((id) => !used.has(id));
  return { covered: missing.length === 0, missing };
}

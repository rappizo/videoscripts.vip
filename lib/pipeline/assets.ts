// Prompt 资产加载与格式化工具
import fs from "node:fs";
import path from "node:path";
import type { MaterialInput, OutlineSection, ScriptSegment } from "./types";

const PROMPTS_DIR = path.join(process.cwd(), "prompts");

const cache = new Map<string, unknown>();

export function loadJson<T>(file: string): T {
  const key = `json:${file}`;
  if (!cache.has(key)) {
    const raw = fs.readFileSync(path.join(PROMPTS_DIR, file), "utf-8");
    cache.set(key, JSON.parse(raw) as T);
  }
  return cache.get(key) as T;
}

export function loadSystem(name: string): string {
  const key = `md:${name}`;
  if (!cache.has(key)) {
    const raw = fs.readFileSync(path.join(PROMPTS_DIR, "system", `${name}.md`), "utf-8");
    cache.set(key, raw);
  }
  return cache.get(key) as string;
}

export function fillTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? "");
}

interface BanlistShape {
  phrases: string[];
  patterns: string[];
}

export function banlistText(): string {
  const ban = loadJson<BanlistShape>("banlist.json");
  return ban.phrases.map((p) => `"${p}"`).join(", ");
}

export function formatMaterials(materials: MaterialInput[]): string {
  if (!materials.length) return "(no materials provided)";
  return materials
    .map(
      (m) =>
        `- [id: ${m.id}] (${m.type}, ${m.isRequired ? "required" : "optional"}): ${m.content}`
    )
    .join("\n");
}

export function requiredMaterialLines(materials: MaterialInput[]): string {
  const required = materials.filter((m) => m.isRequired);
  if (!required.length) return "(none)";
  return required.map((m) => `- [id: ${m.id}] ${m.content}`).join("\n");
}

export function formatOutline(sections: OutlineSection[]): string {
  return sections
    .map(
      (s) =>
        `- ${s.timeRange} [${s.beat}] ${s.summary}\n  direction: ${s.direction}`
    )
    .join("\n");
}

export function formatScript(segments: ScriptSegment[]): string {
  return segments
    .map(
      (s, i) =>
        `#${i + 1} ${s.time}\nVO: ${s.voiceover}\nVisual: ${s.visual}\nText: ${s.onscreenText || "-"}`
    )
    .join("\n\n");
}

interface RubricShape {
  dimensions: {
    id: string;
    name: string;
    description: string;
    anchorLow: string;
    anchorHigh: string;
  }[];
  thresholds: { passAvg: number; passHook: number };
}

export function rubricText(): string {
  const rub = loadJson<RubricShape>("rubric.json");
  const lines = rub.dimensions.map(
    (d) =>
      `- ${d.id} (${d.name}): ${d.description}\n  1 = ${d.anchorLow} | 10 = ${d.anchorHigh}`
  );
  return lines.join("\n");
}

export function rubricThresholds(): { passAvg: number; passHook: number } {
  const rub = loadJson<RubricShape>("rubric.json");
  return rub.thresholds;
}

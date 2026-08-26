// 案例库:懒加载种子 + few-shot 检索
import fs from "node:fs";
import path from "node:path";
import { prisma } from "./db";
import { shuffle } from "./pipeline/utils";

const CASES_DIR = path.join(process.cwd(), "cases");

export async function seedCasesIfEmpty(): Promise<void> {
  const count = await prisma.case.count();
  if (count > 0) return;

  const hooksRaw = JSON.parse(fs.readFileSync(path.join(CASES_DIR, "hooks.json"), "utf-8")) as {
    hooks: { text: string; niche: string; emotion: string; hookType: string }[];
  };
  const structuresRaw = JSON.parse(
    fs.readFileSync(path.join(CASES_DIR, "structures.json"), "utf-8")
  ) as {
    structures: { name: string; description: string; beatFlow: string }[];
  };

  const rows = [
    ...hooksRaw.hooks.map((h) => ({
      category: "hook",
      content: h.text,
      tags: JSON.stringify({ niche: h.niche, emotion: h.emotion, hookType: h.hookType }),
    })),
    ...structuresRaw.structures.map((s) => ({
      category: "structure",
      content: `${s.name} — ${s.description}`,
      tags: JSON.stringify({ beatFlow: s.beatFlow }),
    })),
  ];
  await prisma.case.createMany({ data: rows });
}

export async function getCasesFor(
  category: "hook" | "structure",
  niche: string,
  limit: number
): Promise<string> {
  await seedCasesIfEmpty();
  const all = await prisma.case.findMany({ where: { category } });
  const matching = all.filter((c) => {
    try {
      const tags = JSON.parse(c.tags);
      return tags.niche === niche;
    } catch {
      return false;
    }
  });
  const pool = matching.length >= 2 ? matching : all;
  const picked = shuffle(pool).slice(0, limit);
  return picked.map((c, i) => `Example ${i + 1}:\n${c.content}`).join("\n\n");
}

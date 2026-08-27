// 一键流水线:角度 → 钩子 → 大纲 → 脚本(自动选择 + 自动评审迭代),每步写任务进度
import { prisma } from "./db";
import { resetJobProgress, updateJobProgress } from "./jobs";
import { buildEditPreferences, buildProjectContext, previousScriptSummaries } from "./projectContext";
import { generateAngle } from "./pipeline/angleStage";
import { generateHooks } from "./pipeline/hookStage";
import { generateOutline } from "./pipeline/outlineStage";
import { generateScript } from "./pipeline/scriptStage";
import { reviewAndRefine } from "./pipeline/reviewStage";
import { mapLimit } from "./pipeline/utils";

export async function runAutoPilot(projectId: string, jobId: string): Promise<void> {
  const ctx = await buildProjectContext(projectId);

  // ---------- 1) 角度:无选中则生成并自动选一条 ----------
  let angle = await prisma.angle.findFirst({ where: { projectId, status: "selected" } });
  if (!angle) {
    const existing = await prisma.angle.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } });
    if (!existing.length) {
      const count = Number(process.env.NEXT_PUBLIC_ANGLE_COUNT || 2);
      await resetJobProgress(jobId, { step: "angles", done: 0, total: count });
      const candidates = await mapLimit(Array.from({ length: count }), 4, async (_, i) => {
        const c = await generateAngle(ctx);
        await updateJobProgress(jobId, { step: "angles", done: i + 1, total: count });
        return c;
      });
      for (const c of candidates) {
        await prisma.angle.create({
          data: {
            projectId,
            title: c.title,
            premise: c.premise,
            cards: JSON.stringify(c.cards),
            whyItWorks: c.whyItWorks ?? "",
            explanationZh: c.explanationZh ?? "",
          },
        });
      }
      angle = await prisma.angle.findFirst({ where: { projectId }, orderBy: { createdAt: "asc" } });
    } else {
      // 启发式:优先有 whyItWorks 说明的,否则第一条
      angle = existing.find((a) => a.whyItWorks) ?? existing[0];
    }
    if (angle) {
      await prisma.angle.update({ where: { id: angle.id }, data: { status: "selected" } });
    }
  }
  if (!angle) throw new Error("自动生成角度失败");

  // ---------- 2) 钩子:无选中则生成并选总分最高 ----------
  let hooks = await prisma.hook.findMany({ where: { angleId: angle.id } });
  if (!hooks.length) {
    const hookCount = Number(process.env.HOOK_COUNT || 12);
    await resetJobProgress(jobId, { step: "hooks", done: 0, total: hookCount });
    const candidates = await generateHooks(
      ctx,
      { title: angle.title, premise: angle.premise },
      hookCount,
      async (done, total) => {
        await updateJobProgress(jobId, { step: "hooks", done, total });
      }
    );
    for (const c of candidates) {
      await prisma.hook.create({
        data: {
          angleId: angle.id,
          text: c.text,
          hookType: c.hookType,
          scores: JSON.stringify(c.scores),
          total: c.total,
        },
      });
    }
    hooks = await prisma.hook.findMany({ where: { angleId: angle.id } });
  }
  const sorted = [...hooks].sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
  const hook = sorted.find((h) => h.selected) ?? sorted[0];
  if (!hook) throw new Error("自动生成钩子失败");
  if (!hook.selected) {
    await prisma.hook.update({ where: { id: hook.id }, data: { selected: true } });
  }

  // ---------- 3) 大纲:无锁定则生成并直接锁定 ----------
  let outline = await prisma.outline.findUnique({ where: { angleId: angle.id } });
  if (!outline || outline.status !== "locked") {
    await resetJobProgress(jobId, { step: "outline", attempt: 0, total: 2 });
    const result = await generateOutline(
      ctx,
      { title: angle.title, premise: angle.premise },
      hook.text,
      async (attempt, total) => {
        await updateJobProgress(jobId, { step: "outline", attempt, total });
      }
    );
    outline = await prisma.outline.upsert({
      where: { angleId: angle.id },
      create: { angleId: angle.id, sections: JSON.stringify(result.sections), status: "locked" },
      update: { sections: JSON.stringify(result.sections), status: "locked" },
    });
  }

  // ---------- 4) 脚本:无则生成 3 候选 + 自动评审迭代(≤3 轮) ----------
  const scriptCount = await prisma.script.count({ where: { outlineId: outline.id } });
  if (!scriptCount) {
    const sections = JSON.parse(outline.sections);
    const summaries = await previousScriptSummaries(outline.id);
    const editPrefs = await buildEditPreferences(projectId);
    const count = Number(process.env.SCRIPT_COUNT || 3);
    await resetJobProgress(jobId, { step: "scripts", done: 0, total: count, round: 0 });
    const drafts = await mapLimit(Array.from({ length: count }), 3, () =>
      generateScript(ctx, angle.title, hook.text, sections, "", editPrefs)
    );
    for (let i = 0; i < drafts.length; i++) {
      const draft = drafts[i];
      await updateJobProgress(jobId, { step: "scripts", done: i, total: drafts.length, round: 0 });
      const refined = await reviewAndRefine(
        ctx,
        angle.title,
        hook.text,
        sections,
        draft.segments,
        draft.cards,
        summaries,
        3,
        async (round) => {
          await updateJobProgress(jobId, { round });
        },
        editPrefs
      );
      await prisma.script.create({
        data: {
          outlineId: outline.id,
          hookText: hook.text,
          segments: JSON.stringify(refined.segments),
          cards: JSON.stringify(refined.cards),
          status: "draft",
          reviews: {
            create: refined.reviews.map((r, idx) => ({
              dimensions: JSON.stringify(r.dimensions),
              findings: JSON.stringify(r.findings),
              avgScore: r.avgScore,
              passed: r.passed,
              attempt: idx,
            })),
          },
        },
      });
      await updateJobProgress(jobId, { step: "scripts", done: i + 1, total: drafts.length });
    }
  }

  await updateJobProgress(jobId, { step: "done" });
}

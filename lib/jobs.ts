// 后台生成任务:生命周期、每项目串行队列、全局并发信号量、取消与用量统计
// 注:队列与信号量为进程内存实现,适用于单实例部署(docker / 自托管 Node)
import { prisma } from "./db";
import { aiContext } from "./ai/context";

export class JobCancelledError extends Error {
  constructor() {
    super("任务已取消");
    this.name = "JobCancelledError";
  }
}

export function isJobCancelledError(e: unknown): e is JobCancelledError {
  return e instanceof JobCancelledError;
}

// 每次 LLM 调用前检查任务是否已被取消(取消后抛错终止流程)
export async function assertNotCancelled(jobId: string | undefined | null): Promise<void> {
  if (!jobId) return;
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { status: true } });
  if (job && job.status === "cancelled") throw new JobCancelledError();
}

function safeParseJson(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

// 合并写入任务进度(失败不阻断主流程);数值字段取最大值,避免并发写入回退
export async function updateJobProgress(jobId: string, patch: Record<string, unknown>): Promise<void> {
  try {
    const job = await prisma.job.findUnique({ where: { id: jobId }, select: { progress: true } });
    if (!job) return;
    const current = safeParseJson(job.progress);
    const next: Record<string, unknown> = { ...current };
    for (const [key, value] of Object.entries(patch)) {
      const prev = next[key];
      next[key] = typeof prev === "number" && typeof value === "number" ? Math.max(prev, value) : value;
    }
    await prisma.job.update({
      where: { id: jobId },
      data: { progress: JSON.stringify(next) },
    });
  } catch {
    // ignore
  }
}

// 整体替换任务进度(阶段切换时使用,避免旧字段残留)
export async function resetJobProgress(jobId: string, patch: Record<string, unknown>): Promise<void> {
  try {
    await prisma.job.update({ where: { id: jobId }, data: { progress: JSON.stringify(patch) } });
  } catch {
    // ignore
  }
}

// 写入任务终态结果(如 briefs 列表)
export async function setJobResult(jobId: string, payload: unknown): Promise<void> {
  await prisma.job.update({ where: { id: jobId }, data: { result: JSON.stringify(payload) } });
}

// ---------- 全局并发信号量(AI_CONCURRENCY 个任务并行) ----------
let active = 0;
const waiters: Array<() => void> = [];

export function aiConcurrencyLimit(): number {
  const n = Number(process.env.AI_CONCURRENCY || 4);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 4;
}

async function acquireSlot(): Promise<() => void> {
  while (active >= aiConcurrencyLimit()) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  active += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    active -= 1;
    const next = waiters.shift();
    if (next) next();
  };
}

// ---------- 每项目串行队列(同一项目内任务排队,避免并发写冲突) ----------
const projectChains = new Map<string, Promise<unknown>>();

export function enqueueProjectTask<T>(projectId: string, task: () => Promise<T>): Promise<T> {
  const prev = projectChains.get(projectId) ?? Promise.resolve();
  const run = prev.then(task, task);
  projectChains.set(
    projectId,
    run.then(
      () => undefined,
      () => undefined
    )
  );
  return run;
}

// ---------- 成本估算(每 1M token 美元单价,约值) ----------
const MODEL_PRICES: { prefix: string; input: number; output: number }[] = [
  { prefix: "claude-opus", input: 15, output: 75 },
  { prefix: "claude-sonnet", input: 3, output: 15 },
  { prefix: "claude", input: 3, output: 15 },
  { prefix: "gpt-4", input: 2.5, output: 10 },
  { prefix: "gpt", input: 0.5, output: 1.5 },
];

export function estimateCostUsd(model: string, tokensIn: number, tokensOut: number): number {
  const p = MODEL_PRICES.find((m) => model.startsWith(m.prefix));
  if (!p) return 0;
  const usd = (tokensIn * p.input + tokensOut * p.output) / 1_000_000;
  return Math.round(usd * 10000) / 10000;
}

// ---------- 任务生命周期 ----------
export interface LaunchJobOptions {
  projectId?: string | null;
  stage: string;
  userId: string | null;
}

// 创建任务并立即后台执行(不等待完成);返回任务 id
export async function launchJob(
  options: LaunchJobOptions,
  work: (jobId: string) => Promise<void>
): Promise<string> {
  const job = await prisma.job.create({
    data: {
      stage: options.stage,
      projectId: options.projectId ?? null,
      userId: options.userId,
      status: "pending",
    },
  });
  const task = () => runJob(job.id, work);
  const chain = options.projectId ? enqueueProjectTask(options.projectId, task) : task();
  chain.catch(() => {
    // 错误已在 runJob 内落库
  });
  return job.id;
}

async function runJob(jobId: string, work: (jobId: string) => Promise<void>): Promise<void> {
  const release = await acquireSlot();
  const usage = { tokensIn: 0, tokensOut: 0, model: "" };
  try {
    await prisma.job.update({ where: { id: jobId }, data: { status: "running", startedAt: new Date() } });
    try {
      await aiContext.run({ jobId, usage }, () => work(jobId));
      // 完成前确认未被并发取消
      const fresh = await prisma.job.findUnique({ where: { id: jobId }, select: { status: true } });
      if (fresh?.status === "cancelled") {
        await prisma.job.update({ where: { id: jobId }, data: { finishedAt: new Date() } });
        return;
      }
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: "succeeded",
          finishedAt: new Date(),
          tokensIn: usage.tokensIn,
          tokensOut: usage.tokensOut,
          model: usage.model || "",
          costUsd: estimateCostUsd(usage.model, usage.tokensIn, usage.tokensOut),
        },
      });
    } catch (e) {
      if (isJobCancelledError(e)) {
        await prisma.job.update({
          where: { id: jobId },
          data: { status: "cancelled", finishedAt: new Date() },
        });
      } else {
        console.error("[job]", e);
        await prisma.job.update({
          where: { id: jobId },
          data: {
            status: "failed",
            error: e instanceof Error ? e.message : String(e),
            finishedAt: new Date(),
          },
        });
      }
    }
  } finally {
    release();
  }
}

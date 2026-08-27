// 客户端任务轮询与取消(配合 /api/jobs/[id])
export interface JobStatus {
  id: string;
  stage: string;
  status: "pending" | "running" | "succeeded" | "failed" | "cancelled";
  progress: Record<string, unknown>;
  result: unknown;
  error: string | null;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

const TERMINAL = new Set(["succeeded", "failed", "cancelled"]);

export async function fetchJob(id: string): Promise<JobStatus> {
  const res = await fetch(`/api/jobs/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as JobStatus;
}

// 轮询直到任务进入终态;onProgress 用于刷新进度显示
export async function waitForJob(
  id: string,
  onProgress?: (job: JobStatus) => void
): Promise<JobStatus> {
  for (;;) {
    const job = await fetchJob(id);
    onProgress?.(job);
    if (TERMINAL.has(job.status)) return job;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

export async function cancelJob(id: string): Promise<void> {
  await fetch(`/api/jobs/${id}`, { method: "DELETE" });
}

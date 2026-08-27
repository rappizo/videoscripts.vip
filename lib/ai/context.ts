// AI 调用上下文:任务取消标记与 token 用量累计(AsyncLocalStorage,按请求/任务隔离)
import { AsyncLocalStorage } from "node:async_hooks";

export interface AiUsage {
  tokensIn: number;
  tokensOut: number;
  model: string;
}

export interface AiCallContext {
  jobId?: string;
  usage: AiUsage;
}

export const aiContext = new AsyncLocalStorage<AiCallContext>();

export function currentAiUsage(): AiUsage | null {
  return aiContext.getStore()?.usage ?? null;
}

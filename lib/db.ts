import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Serverless 环境对数据库连接卡死没有耐心:给连接/池/套接字加显式超时(秒),
// 保证失败时快速报错而不是无限挂起(Neon 冷启动唤醒通常只需 1-3s)
function withTimeoutParams(url: string): string {
  if (!url) return url;
  const urlObj = new URL(url);
  const params: Record<string, string> = { connect_timeout: "10", pool_timeout: "10", socket_timeout: "30" };
  for (const [k, v] of Object.entries(params)) {
    if (!urlObj.searchParams.has(k)) urlObj.searchParams.set(k, v);
  }
  return urlObj.toString();
}

const datasourceUrl = process.env.DATABASE_URL ? withTimeoutParams(process.env.DATABASE_URL) : undefined;

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient(datasourceUrl ? { datasourceUrl } : undefined);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

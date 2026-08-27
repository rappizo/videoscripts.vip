// 请求级会话与项目访问控制(供服务端页面与 API 路由使用)
import { cookies } from "next/headers";
import { MASTER_UID, SESSION_COOKIE, authEnabled, verifySessionToken } from "./auth";
import { prisma } from "./db";

export { MASTER_UID };

export type SessionUid = string | null; // null = 免登录(本地开发)

// 管理员账号在会话中映射为 MASTER_UID(可访问全部项目)
async function resolveUid(uid: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: uid }, select: { role: true } });
  if (!user) return null;
  return user.role === "admin" ? MASTER_UID : uid;
}

// 从 Request 的 Cookie 中解析会话并返回 uid;未启用认证时返回 null(不过滤)
export async function sessionUid(req: Request): Promise<SessionUid> {
  if (!authEnabled()) return null;
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  const uid = await verifySessionToken(match?.[1], process.env.AUTH_SECRET!);
  return uid ? resolveUid(uid) : null;
}

// 服务端组件(页面)读取当前会话 uid

export async function pageUid(): Promise<SessionUid> {
  if (!authEnabled()) return null;
  const jar = await cookies();
  const uid = await verifySessionToken(jar.get(SESSION_COOKIE)?.value, process.env.AUTH_SECRET!);
  return uid ? resolveUid(uid) : null;
}

// 项目查询过滤条件:普通用户只看自己的项目;主账号 / 免登录看全部
export function projectScope(uid: SessionUid): { userId?: string } {
  return uid && uid !== MASTER_UID ? { userId: uid } : {};
}

// 嵌套资源(角度/钩子/大纲/脚本)的所有权判断
export function ownsProject(uid: SessionUid, projectUserId: string | null): boolean {
  if (!uid || uid === MASTER_UID) return true;
  return projectUserId === uid;
}

// 取当前用户可见的项目;无权/不存在返回 null(调用方回 404,避免泄露存在性)
export async function accessibleProject(uid: SessionUid, projectId: string) {
  return prisma.project.findFirst({ where: { id: projectId, ...projectScope(uid) } });
}

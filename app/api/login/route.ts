import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  createSessionToken,
  verifyPassword,
} from "@/lib/auth";
import { handleError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  if (!process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "AUTH_SECRET is not configured" }, { status: 500 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "请输入邮箱和密码" }, { status: 400 });
    }
    const email = parsed.data.email.trim().toLowerCase();

    // 数据库账号登录
    const user = await prisma.user.findUnique({ where: { email } });
    const ok = user && (await verifyPassword(parsed.data.password, user.passwordHash));
    if (!ok) {
      return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
    }

    const token = await createSessionToken(process.env.AUTH_SECRET, user!.id);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

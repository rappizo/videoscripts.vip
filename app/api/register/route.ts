import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS, createSessionToken, hashPassword } from "@/lib/auth";
import { handleError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

const registerSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
});

// 注册开放条件:当前无任何用户(首个账号即管理员)或 ALLOW_REGISTRATION=true
export async function POST(req: Request) {
  if (!process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "AUTH_SECRET is not configured" }, { status: 500 });
  }
  try {
    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "需要合法的邮箱和至少 8 位的密码" }, { status: 400 });
    }
    const email = parsed.data.email.trim().toLowerCase();
    const userCount = await prisma.user.count();
    if (userCount > 0 && process.env.ALLOW_REGISTRATION !== "true") {
      return NextResponse.json({ error: "注册已关闭,请联系管理员" }, { status: 403 });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 });
    }
    const user = await prisma.user.create({
      data: { email, passwordHash: await hashPassword(parsed.data.password) },
    });
    // 首个账号自动接管存量无主项目
    if (userCount === 0) {
      await prisma.project.updateMany({ where: { userId: null }, data: { userId: user.id } });
    }
    const token = await createSessionToken(process.env.AUTH_SECRET, user.id);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

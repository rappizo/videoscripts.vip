import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import {
  MASTER_UID,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  createSessionToken,
  verifyPassword,
} from "@/lib/auth";
import { handleError } from "@/lib/routeHelpers";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().max(200).optional(),
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
      return NextResponse.json({ error: "password is required" }, { status: 400 });
    }
    const { email, password } = parsed.data;

    let uid: string | null = null;
    if (email?.trim()) {
      // 账号登录
      const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
      if (user && (await verifyPassword(password, user.passwordHash))) uid = user.id;
    } else {
      // 主密码登录(APP_PASSWORD)
      const expected = process.env.APP_PASSWORD;
      if (expected && password === expected) uid = MASTER_UID;
    }
    if (!uid) {
      return NextResponse.json({ error: email?.trim() ? "邮箱或密码错误" : "密码错误" }, { status: 401 });
    }

    const token = await createSessionToken(process.env.AUTH_SECRET, uid);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

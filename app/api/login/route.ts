import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAuthToken } from "@/lib/auth";

export async function POST(req: Request) {
  const expected = process.env.APP_PASSWORD;
  if (!expected || !process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "APP_PASSWORD / AUTH_SECRET is not configured" }, { status: 500 });
  }
  const body = await req.json().catch(() => ({}));
  const password = typeof body?.password === "string" ? body.password : "";
  if (password !== expected) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }
  const token = await createAuthToken(process.env.AUTH_SECRET);
  const jar = await cookies();
  jar.set("auth", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 3600,
    path: "/",
  });
  return NextResponse.json({ ok: true });
}

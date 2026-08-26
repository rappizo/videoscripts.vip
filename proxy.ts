import { NextRequest, NextResponse } from "next/server";
import { authEnabled, verifyAuthToken } from "@/lib/auth";

const PUBLIC_PREFIXES = ["/login", "/_next", "/favicon", "/api/login"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  // 未配置密码则跳过保护(本地开发)
  if (!authEnabled()) return NextResponse.next();

  const token = req.cookies.get("auth")?.value;
  const ok = await verifyAuthToken(token, process.env.AUTH_SECRET!);
  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

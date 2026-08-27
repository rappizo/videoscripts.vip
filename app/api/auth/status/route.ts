import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authEnabled } from "@/lib/auth";

export const dynamic = "force-dynamic";

// 登录页使用的公开配置(不泄露敏感信息)
export async function GET() {
  const userCount = await prisma.user.count();
  return NextResponse.json({
    authEnabled: authEnabled(),
    passwordLogin: Boolean(process.env.APP_PASSWORD),
    registrationOpen: userCount === 0 || process.env.ALLOW_REGISTRATION === "true",
  });
}

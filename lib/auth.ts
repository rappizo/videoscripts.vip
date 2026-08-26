// 认证工具:HMAC-SHA256 签名 Cookie(Edge 与 Node 运行时通用,仅用 Web Crypto)
const COOKIE_MAX_AGE = 30 * 24 * 3600; // 30 天

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function signAuth(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return toBase64Url(new Uint8Array(sig));
}

export async function createAuthToken(secret: string): Promise<string> {
  const exp = Date.now() + COOKIE_MAX_AGE * 1000;
  const sig = await signAuth(String(exp), secret);
  return `${exp}.${sig}`;
}

export async function verifyAuthToken(value: string | undefined, secret: string): Promise<boolean> {
  if (!value || !secret) return false;
  const [expStr, sig] = value.split(".");
  if (!expStr || !sig) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = await signAuth(expStr, secret);
  if (expected.length !== sig.length) return false;
  // 常量时间比较
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

export function authEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD && process.env.AUTH_SECRET);
}

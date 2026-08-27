// 认证工具:PBKDF2 密码哈希 + HMAC-SHA256 签名会话 Cookie(Edge 与 Node 运行时通用,仅用 Web Crypto)
const COOKIE_MAX_AGE = 30 * 24 * 3600; // 30 天
const PBKDF2_ITERATIONS = 100_000;

// APP_PASSWORD 登录发放的"主账号"标识,可访问全部项目
export const MASTER_UID = "master";

export const SESSION_COOKIE = "auth";

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: COOKIE_MAX_AGE,
  path: "/",
} as const;

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const bin = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
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

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------- 密码哈希(PBKDF2-SHA256,格式 pbkdf2$iterations$salt$hash) ----------

async function derivePasswordBits(
  password: string,
  salt: Uint8Array,
  iterations: number,
  bitLength: number
): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    bitLength
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await derivePasswordBits(password, salt, PBKDF2_ITERATIONS, 256);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  try {
    const expected = fromBase64Url(parts[3]);
    const bits = await derivePasswordBits(
      password,
      fromBase64Url(parts[2]),
      iterations,
      expected.length * 8
    );
    const actual = new Uint8Array(bits);
    if (actual.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
    return diff === 0;
  } catch {
    return false;
  }
}

// ---------- 会话令牌 `${exp}.${uid}.${sig}` ----------

export async function createSessionToken(secret: string, uid: string): Promise<string> {
  const exp = Date.now() + COOKIE_MAX_AGE * 1000;
  const payload = `${exp}.${uid}`;
  return `${payload}.${await signAuth(payload, secret)}`;
}

// 校验会话并返回 uid;无效/过期返回 null
// 兼容旧格式(exp.sig,由 APP_PASSWORD 登录发放):校验通过视为主账号

export async function verifySessionToken(value: string | undefined, secret: string): Promise<string | null> {
  if (!value || !secret) return null;
  const parts = value.split(".");
  if (parts.length === 3) {
    const [expStr, uid, sig] = parts;
    if (!expStr || !uid || !sig) return null;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || exp < Date.now()) return null;
    const expected = await signAuth(`${expStr}.${uid}`, secret);
    return constantTimeEqual(expected, sig) ? uid : null;
  }
  if (parts.length === 2) {
    return (await verifyAuthToken(value, secret)) ? MASTER_UID : null;
  }
  return null;
}

// ---------- 旧接口(兼容已有调用) ----------

export async function createAuthToken(secret: string): Promise<string> {
  return createSessionToken(secret, MASTER_UID);
}

export async function verifyAuthToken(value: string | undefined, secret: string): Promise<boolean> {
  if (!value || !secret) return false;
  const [expStr, sig] = value.split(".");
  if (!expStr || !sig) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = await signAuth(expStr, secret);
  return constantTimeEqual(expected, sig);
}

// 是否启用登录保护:设置 AUTH_SECRET 即启用(本地留空则跳过)
export function authEnabled(): boolean {
  return Boolean(process.env.AUTH_SECRET);
}

"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Btn, Spinner } from "@/components/ui";

interface AuthStatus {
  passwordLogin: boolean;
  registrationOpen: boolean;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [mode, setMode] = useState<"account" | "password" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus | null>(null);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((j: AuthStatus) => {
        setStatus(j);
        setMode(j.passwordLogin ? "password" : "account");
      })
      .catch(() => setMode("password"));
  }, []);

  async function submit() {
    if (!mode) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "account" ? { email, password } : { password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "登录失败");
      router.push(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  const showToggle = status?.passwordLogin && status?.registrationOpen;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm w-full max-w-sm">
      <h1 className="text-lg font-bold text-center">
        <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-slate-400 bg-clip-text text-transparent">
          VideoScripts
        </span>
      </h1>
      <p className="mt-1 mb-5 text-center text-sm text-slate-500">
        {mode === "account" ? "账号登录" : "输入访问密码"}
      </p>
      <div className="space-y-3">
        {mode === "account" && (
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="邮箱"
            autoFocus
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white"
          />
        )}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={mode === "account" ? "密码" : "访问密码"}
          autoFocus={mode === "password"}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white"
        />
      </div>
      {busy && (
        <div className="mt-3">
          <Spinner label="验证中…" />
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4">
        <Btn onClick={submit} disabled={busy || !password || (mode === "account" && !email)} className="w-full">
          进入
        </Btn>
      </div>
      <div className="mt-4 space-y-1 text-center text-sm text-slate-500">
        {showToggle && (
          <p>
            <button
              onClick={() => setMode(mode === "account" ? "password" : "account")}
              className="text-emerald-600 hover:text-emerald-700"
            >
              {mode === "account" ? "使用访问密码登录" : "使用账号登录"}
            </button>
          </p>
        )}
        {status?.registrationOpen && (
          <p>
            没有账号?{" "}
            <Link href="/register" className="text-emerald-600 hover:text-emerald-700">
              注册
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}


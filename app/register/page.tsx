"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Btn, Spinner } from "@/components/ui";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((j) => setOpen(Boolean(j.registrationOpen)))
      .catch(() => setOpen(null));
  }, []);

  async function submit() {
    if (!email.trim() || password.length < 8) {
      setError("请输入合法邮箱和至少 8 位的密码");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "注册失败");
      router.push(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm w-full max-w-sm">
      <h1 className="text-lg font-bold text-center">
        <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-slate-400 bg-clip-text text-transparent">
          VideoScripts
        </span>
      </h1>
      <p className="mt-1 mb-5 text-center text-sm text-slate-500">创建账号</p>
      {open === false && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          注册已关闭,请联系管理员开通账号。
        </p>
      )}
      <div className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="邮箱"
          autoFocus
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="密码(至少 8 位)"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white"
        />
      </div>
      {busy && (
        <div className="mt-3">
          <Spinner label="创建中…" />
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4">
        <Btn onClick={submit} disabled={busy || open === false} className="w-full">
          注册并登录
        </Btn>
      </div>
      <p className="mt-4 text-center text-sm text-slate-500">
        已有账号?{" "}
        <Link href="/login" className="text-emerald-600 hover:text-emerald-700">
          去登录
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </div>
  );
}

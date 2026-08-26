"use client";

import { useState } from "react";
import { Btn, Panel } from "@/components/ui";

export default function DiagnosePage() {
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function check() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/models");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <h1 className="text-xl font-bold">模型诊断</h1>
      <Panel
        title="apiyi 接入检查"
        right={
          <Btn onClick={check} disabled={busy}>
            {busy ? "检查中…" : "检查连接 / 列出模型"}
          </Btn>
        }
      >
        <p className="text-sm text-zinc-500">
          调用 <code className="text-zinc-300">GET /v1/models</code> 验证 API Key 和可用模型名。
          确认后把 claude 模型名填入 <code className="text-zinc-300">.env</code> 的 MODEL_CREATIVE /
          MODEL_CRITIC。
        </p>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {result != null && (
          <pre className="mt-3 overflow-auto rounded-lg bg-zinc-950 border border-zinc-800 p-4 text-xs text-zinc-300 max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </Panel>
    </div>
  );
}

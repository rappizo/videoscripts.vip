"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Btn, Panel } from "./ui";

const NICHES = ["tech", "fitness", "finance", "lifestyle", "kitchen", "business", "education", "other"];
const MATERIAL_TYPES = ["fact", "data", "quote", "feature", "keyword", "story"];

interface MaterialRow {
  type: string;
  content: string;
  isRequired: boolean;
}

export default function CreateProjectForm() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [niche, setNiche] = useState("tech");
  const [audience, setAudience] = useState("");
  const [durationSec, setDurationSec] = useState(30);
  const [style, setStyle] = useState("");
  const [goal, setGoal] = useState("");
  const [description, setDescription] = useState("");
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!topic.trim()) {
      setError("Topic is required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          description,
          niche,
          audience,
          durationSec,
          style,
          goal,
          materials: materials.filter((m) => m.content.trim()),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      router.push(`/project/${data.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <Panel
      title="新建项目"
      tone="accent"
      right={<Btn onClick={submit} disabled={busy || !topic.trim()}>{busy ? "创建中…" : "创建项目"}</Btn>}
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs text-zinc-500">选题 Topic *</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. How to charge your phone battery properly"
            className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm outline-none focus:border-violet-500"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-zinc-500">品类</label>
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-2 text-sm outline-none focus:border-violet-500"
            >
              {NICHES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500">时长(秒)</label>
            <input
              type="number"
              min={10}
              max={180}
              value={durationSec}
              onChange={(e) => setDurationSec(Number(e.target.value) || 30)}
              className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">目标受众</label>
            <input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. iPhone users 18-30"
              className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm outline-none focus:border-violet-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500">风格偏好(可选)</label>
            <input
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="e.g. casual, fast-paced"
              className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">目标(可选)</label>
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. views, saves, conversions"
              className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm outline-none focus:border-violet-500"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-zinc-500">背景说明(可选)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="背景、产品介绍、账号定位…"
            className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm outline-none focus:border-violet-500 resize-y"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-500">
              素材(字段化录入 — 事实/数据/金句/卖点,会在脚本中被强制引用)
            </label>
            <Btn
              variant="subtle"
              onClick={() => setMaterials([...materials, { type: "fact", content: "", isRequired: true }])}
            >
              + 加一条素材
            </Btn>
          </div>
          {materials.map((m, i) => (
            <div key={i} className="mt-2 flex gap-2">
              <select
                value={m.type}
                onChange={(e) => {
                  const next = [...materials];
                  next[i].type = e.target.value;
                  setMaterials(next);
                }}
                className="rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-xs outline-none"
              >
                {MATERIAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                value={m.content}
                onChange={(e) => {
                  const next = [...materials];
                  next[i].content = e.target.value;
                  setMaterials(next);
                }}
                placeholder="具体事实、数字、原话…"
                className="flex-1 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-sm outline-none focus:border-violet-500"
              />
              <label className="flex items-center gap-1 text-xs text-zinc-500 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={m.isRequired}
                  onChange={(e) => {
                    const next = [...materials];
                    next[i].isRequired = e.target.checked;
                    setMaterials(next);
                  }}
                />
                必用
              </label>
              <Btn
                variant="danger"
                onClick={() => setMaterials(materials.filter((_, j) => j !== i))}
              >
                ×
              </Btn>
            </div>
          ))}
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </Panel>
  );
}

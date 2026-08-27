"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { waitForJob } from "@/lib/jobClient";
import { Btn, Spinner, Tag } from "./ui";

export interface Brief {
  title: string;
  hookPreview: string;
  description: string;
  audience: string;
  style: string;
  goal: string;
  explanationZh: string;
  materials: { type: string; content: string; isRequired: boolean }[];
}

const CATEGORIES = [
  { label: "护肤品", niche: "skincare", emoji: "🧴" },
  { label: "美妆", niche: "beauty", emoji: "💄" },
  { label: "数码科技", niche: "tech", emoji: "📱" },
  { label: "厨具", niche: "kitchen", emoji: "🍳" },
  { label: "健身运动", niche: "fitness", emoji: "💪" },
  { label: "家居生活", niche: "home", emoji: "🛋️" },
  { label: "服饰穿搭", niche: "fashion", emoji: "👗" },
  { label: "食品饮料", niche: "food", emoji: "🥤" },
  { label: "母婴", niche: "baby", emoji: "🍼" },
  { label: "宠物", niche: "pets", emoji: "🐾" },
  { label: "其他", niche: "other", emoji: "📦" },
];

export default function BriefFlow() {
  const router = useRouter();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [productName, setProductName] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [description, setDescription] = useState("");
  const [refLink, setRefLink] = useState("");
  const [durationSec, setDurationSec] = useState(30);
  const [goal, setGoal] = useState("");
  const [briefs, setBriefs] = useState<Brief[] | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  // 每次开始生成方案即创建一个项目草稿(历史可查、中途关闭也不丢)
  async function ensureProject(): Promise<string> {
    if (projectId) return projectId;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: productName.trim(),
        description: description.trim(),
        niche: category.niche,
        productCategory: category.label,
        productName: productName.trim(),
        durationSec,
        goal: goal.trim(),
        status: "draft",
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((json as { error?: string }).error ?? "创建项目失败");
    const id = (json as { id: string }).id;
    setProjectId(id);
    return id;
  }

  async function generate() {
    if (!productName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const pid = await ensureProject();
      const res = await fetch("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: category.label,
          niche: category.niche,
          productName: productName.trim(),
          projectId: pid,
          description: description.trim(),
          ref: refLink.trim(),
          durationSec,
          goal: goal.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
      const jobId = (json as { jobId?: string }).jobId;
      if (jobId) {
        const final = await waitForJob(jobId);
        if (final.status === "failed") throw new Error(final.error ?? "生成失败");
        if (final.status === "cancelled") return;
        const result = (final.result ?? {}) as { briefs?: Brief[] };
        setBriefs(result.briefs ?? []);
      } else {
        setBriefs((json as { briefs: Brief[] }).briefs);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function startWithBrief(b: Brief) {
    if (!projectId) return;
    setCreating(b.title);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: b.title,
          description: b.description,
          brief: b.hookPreview,
          audience: b.audience,
          style: b.style,
          goal: b.goal,
          durationSec,
          materials: b.materials,
          status: "active",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Failed to apply brief");
      router.push(`/project/${projectId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setCreating(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold">
          <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-slate-400 bg-clip-text text-transparent">
            产品宣传视频脚本
          </span>
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          选品类 → 填产品名 → 生成 2 个方案(自动创建项目草稿) → 选一个开工
        </p>
      </div>

      <div className="mb-4">
        <label className="text-xs font-medium text-slate-500">① 产品品类</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.niche}
              onClick={() => setCategory(c)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                category.niche === c.niche
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-medium"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <input
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate()}
          placeholder={`输入产品名称,例如:VC 焕亮精华、便携榨汁杯…`}
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white"
        />
        <Btn onClick={generate} disabled={busy || !productName.trim()}>
          {briefs ? "换一批(重新生成 2 个)" : "生成 2 个项目方案"}
        </Btn>
      </div>

      <button
        onClick={() => setShowAdvanced((v) => !v)}
        className="mt-3 text-xs text-slate-400 hover:text-emerald-600"
      >
        {showAdvanced ? "收起高级输入 ▲" : "高级输入(可选):产品描述 / 参考视频 / 时长 / 目标 ▼"}
      </button>
      {showAdvanced && (
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-xs text-slate-500">产品描述(一句话讲清楚卖什么、有什么卖点)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 15% 维 C + 维 E + 阿魏酸的提亮精华,清爽不粘腻…"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-500">参考视频链接(模仿其节奏与结构,不抄文案)</label>
            <input
              value={refLink}
              onChange={(e) => setRefLink(e.target.value)}
              placeholder="https://…"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">时长</label>
            <div className="mt-1 flex gap-1.5">
              {[15, 30, 60].map((d) => (
                <button
                  key={d}
                  onClick={() => setDurationSec(d)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    durationSec === d
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-medium"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500">目标(不选则 AI 自定)</label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            >
              <option value="">不指定</option>
              <option value="views">播放量 views</option>
              <option value="engagement">互动 engagement</option>
              <option value="saves">收藏 saves</option>
              <option value="conversions">转化 conversions</option>
              <option value="brand awareness">品牌认知 brand awareness</option>
            </select>
          </div>
        </div>
      )}

      {busy && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <Spinner label="正在为产品构思 2 个不同角度的项目方案…" />
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {briefs && !busy && (
        <>
          <p className="mt-5 mb-2 text-xs text-slate-500">
            已生成 {briefs.length} 个方案(已存入项目草稿,每个的创意牌组合不同),选一个开工进入五阶段流水线:
          </p>
          <div className="grid gap-3">
            {briefs.map((b, i) => (
              <div
                key={i}
                className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/50 p-4 hover:border-emerald-300 transition-colors"
              >
                <div className="grid gap-3 md:grid-cols-2">
                  {/* 左:方案原文 */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-800">{b.title}</h3>
                      <span className="shrink-0 text-xs text-slate-400">方案 {i + 1}</span>
                    </div>
                    <p className="mt-2 rounded-lg border border-emerald-200/60 bg-white px-3 py-2 text-sm text-emerald-800 font-medium">
                      🪝 {b.hookPreview}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">{b.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Tag>{b.audience}</Tag>
                      <Tag>{b.style}</Tag>
                      <Tag>目标:{b.goal}</Tag>
                    </div>
                    {b.materials.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {b.materials.slice(0, 3).map((m, j) => (
                          <li key={j} className="text-xs text-slate-500">
                            · {m.content}
                          </li>
                        ))}
                        {b.materials.length > 3 && (
                          <li className="text-xs text-slate-400">…共 {b.materials.length} 条卖点素材</li>
                        )}
                      </ul>
                    )}
                  </div>
                  {/* 右:中文解析 */}
                  {b.explanationZh && (
                    <div className="rounded-lg bg-emerald-50/60 p-3 md:border-l md:border-emerald-100">
                      <p className="text-xs font-medium text-emerald-600">中文解析</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-700">{b.explanationZh}</p>
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <Btn onClick={() => startWithBrief(b)} disabled={!!creating}>
                    {creating === b.title ? "创建中…" : "用这个方案开工 →"}
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

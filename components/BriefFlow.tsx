"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Btn, Spinner, Tag } from "./ui";

export interface Brief {
  title: string;
  hookPreview: string;
  description: string;
  audience: string;
  style: string;
  goal: string;
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
  const [briefs, setBriefs] = useState<Brief[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  async function generate() {
    if (!productName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: category.label, niche: category.niche, productName: productName.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
      setBriefs((json as { briefs: Brief[] }).briefs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function startWithBrief(b: Brief) {
    setCreating(b.title);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: b.title,
          description: `${b.description}\n\nProduct: ${productName.trim()}`,
          niche: category.niche,
          productCategory: category.label,
          productName: productName.trim(),
          brief: b.hookPreview,
          audience: b.audience,
          durationSec: 30,
          style: b.style,
          goal: b.goal,
          materials: b.materials,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Failed to create project");
      router.push(`/project/${(json as { id: string }).id}`);
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
        <p className="mt-1 text-sm text-slate-500">选品类 → 填产品名 → AI 生成 5 个项目方案,选一个开工</p>
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
          {briefs ? "换一批(重新生成 5 个)" : "生成 5 个项目方案"}
        </Btn>
      </div>

      {busy && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <Spinner label="正在为产品构思 5 个不同角度的项目方案…" />
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {briefs && !busy && (
        <>
          <p className="mt-5 mb-2 text-xs text-slate-500">
            已生成 {briefs.length} 个方案(每个的创意牌组合不同),选一个继续进入五阶段流水线:
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {briefs.map((b, i) => (
              <div
                key={i}
                className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/50 p-4 hover:border-emerald-300 transition-colors"
              >
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

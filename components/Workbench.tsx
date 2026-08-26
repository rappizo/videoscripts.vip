"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Btn, Panel, ScoreBar, Spinner, Tag } from "./ui";
import type {
  OutlineSection,
  ProjectDetail,
  SerializedAngle,
  SerializedScript,
  SerializedSegment,
} from "./types";

const MATERIAL_TYPES: Record<string, string> = {
  fact: "事实",
  data: "数据",
  quote: "金句",
  feature: "卖点",
  keyword: "关键词",
  story: "故事",
};

export default function Workbench({ initial }: { initial: ProjectDetail }) {
  const [data, setData] = useState<ProjectDetail>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAllHooks, setShowAllHooks] = useState(false);
  const [coverage, setCoverage] = useState<{ coverageOk: boolean; missing: string[] } | null>(null);
  const [outlineEdit, setOutlineEdit] = useState<{ id: string; sections: OutlineSection[] } | null>(null);
  const [scriptDrafts, setScriptDrafts] = useState<Record<string, SerializedSegment[]>>({});
  const [savedTip, setSavedTip] = useState<string | null>(null);

  const selectedAngle = useMemo(
    () => data.angles.find((a) => a.status === "selected") ?? null,
    [data.angles]
  );
  const selectedHook = useMemo(
    () => selectedAngle?.hooks.find((h) => h.selected) ?? null,
    [selectedAngle]
  );
  const outline = selectedAngle?.outline ?? null;
  const scripts = useMemo(() => outline?.scripts ?? [], [outline]);
  // 大纲草稿:编辑绑定的 outline id 与当前一致才生效,否则用最新大纲
  const draftSections = useMemo(
    () => (outlineEdit && outlineEdit.id === outline?.id ? outlineEdit.sections : outline?.sections ?? []),
    [outlineEdit, outline]
  );

  async function refresh() {
    const res = await fetch(`/api/projects/${data.id}`);
    if (res.ok) setData(await res.json());
  }

  async function run(label: string, url: string, init?: RequestInit, onOk?: (j: unknown) => void) {
    setBusy(label);
    setError(null);
    try {
      const res = await fetch(url, init);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
      onOk?.(json);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const materialById = useMemo(() => {
    const m = new Map<string, string>();
    for (const mat of data.materials) m.set(mat.id, mat.content);
    return m;
  }, [data.materials]);

  // ---------- 各阶段操作 ----------
  const genAngles = () =>
    run(`正在生成 ${process.env.NEXT_PUBLIC_ANGLE_COUNT || 5} 个角度…`, `/api/projects/${data.id}/angles`, {
      method: "POST",
    });

  const pickAngle = (angle: SerializedAngle) => {
    if (angle.status === "selected" || busy) return;
    run("保存角度选择…", `/api/angles/${angle.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "selected" }),
    });
  };

  const genHooks = () =>
    selectedAngle &&
    run("正在生成 12 个钩子并评分…", `/api/angles/${selectedAngle.id}/hooks`, { method: "POST" });

  const pickHook = (id: string) => {
    if (busy) return;
    run("保存钩子选择…", `/api/hooks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selected: true }),
    });
  };

  const genOutline = () => {
    if (!selectedAngle || !selectedHook) return;
    setOutlineEdit(null);
    run(
      "正在生成大纲(素材引用锁死)…",
      `/api/angles/${selectedAngle.id}/outline`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hookText: selectedHook.text }),
      },
      (json) => {
        const j = json as { coverageOk?: boolean; missing?: string[] };
        setCoverage(j.coverageOk === false ? { coverageOk: false, missing: j.missing ?? [] } : null);
      }
    );
  };

  const lockAndGenScripts = async () => {
    if (!outline) return;
    setBusy("锁定大纲…");
    setError(null);
    try {
      const res = await fetch(`/api/outlines/${outline.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: draftSections, status: "locked" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Failed to save outline");
      setBusy("正在生成 3 个脚本候选并评审…");
      const res2 = await fetch(`/api/outlines/${outline.id}/scripts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hookText: selectedHook?.text ?? "" }),
      });
      const json2 = await res2.json().catch(() => ({}));
      if (!res2.ok) throw new Error((json2 as { error?: string }).error ?? "Failed to generate scripts");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const saveScript = (s: SerializedScript) =>
    run("保存修改…", `/api/scripts/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segments: scriptDrafts[s.id] ?? s.segments }),
    }).then(() => {
      setSavedTip(s.id);
      setTimeout(() => setSavedTip(null), 2500);
    });

  const reviewScript = (s: SerializedScript) =>
    run("评审+定向改写中(可能 1-2 分钟)…", `/api/scripts/${s.id}/review`, { method: "POST" });

  const deleteScript = async (s: SerializedScript) => {
    if (!confirm("删除该脚本?")) return;
    await fetch(`/api/scripts/${s.id}`, { method: "DELETE" });
    await refresh();
  };

  const copyScript = (s: SerializedScript) => {
    const segs = scriptDrafts[s.id] ?? s.segments;
    const text = [
      `[HOOK] ${s.hookText}`,
      "",
      ...segs.map(
        (seg) =>
          `(${seg.time})\nVO: ${seg.voiceover}\nVisual: ${seg.visual}\nText: ${seg.onscreenText || "-"}`
      ),
    ].join("\n\n");
    navigator.clipboard.writeText(text);
    setSavedTip("copied");
    setTimeout(() => setSavedTip(null), 2000);
  };

  const editSegment = (script: SerializedScript, index: number, field: keyof SerializedSegment, value: string) => {
    setScriptDrafts((prev) => {
      const base = prev[script.id] ?? script.segments;
      const list = base.map((seg, i) => (i === index ? { ...seg, [field]: value } : seg));
      return { ...prev, [script.id]: list };
    });
  };

  const editOutlineSection = (index: number, field: keyof OutlineSection, value: string) => {
    if (!outline) return;
    setOutlineEdit((prev) => {
      const base = prev && prev.id === outline.id ? prev.sections : outline.sections;
      const next = base.map((sec, i) => {
        if (i !== index) return sec;
        if (field === "materialRefs")
          return { ...sec, materialRefs: value.split(",").map((x) => x.trim()).filter(Boolean) };
        return { ...sec, [field]: value };
      });
      return { id: outline.id, sections: next };
    });
  };

  const latestReview = (s: SerializedScript) => s.reviews[s.reviews.length - 1];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* 头部 */}
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← 返回项目列表
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{data.topic}</h1>
          <Tag>{data.niche || "未分类"}</Tag>
          <Tag>{data.durationSec}s</Tag>
          {data.audience && <Tag>{data.audience}</Tag>}
        </div>
        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        {busy && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <Spinner label={busy} />
          </div>
        )}
      </div>

      {/* 素材 */}
      <Panel
        title={`素材(${data.materials.length})— 会在脚本中被强制引用`}
        right={
          data.description ? (
            <span className="text-xs text-slate-500 max-w-md truncate">{data.description}</span>
          ) : undefined
        }
      >
        {data.materials.length ? (
          <div className="flex flex-wrap gap-2">
            {data.materials.map((m) => (
              <span
                key={m.id}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm"
                title={m.content}
              >
                <span className="text-slate-400 text-xs">{MATERIAL_TYPES[m.type] ?? m.type}</span>
                {m.isRequired && <span className="text-amber-600 text-xs ml-1">必用</span>}
                <span className="ml-2">{m.content}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">未录入素材(可在角度/大纲阶段继续)</p>
        )}
      </Panel>

      {/* 步骤 1:角度 */}
      <Panel
        title="① 内容角度"
        tone={selectedAngle ? "accent" : "default"}
        right={
          <Btn onClick={genAngles} disabled={!!busy} variant="ghost">
            {data.angles.length ? "重新生成 5 个角度" : "生成 5 个角度"}
          </Btn>
        }
      >
        {data.angles.length === 0 ? (
          <p className="text-sm text-slate-500">
            每个角度会随机抽取一套创意牌(叙事结构 × 创作者人设 × 开场方式 × 情绪曲线),避免套路化。
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.angles.map((a) => (
              <button
                key={a.id}
                onClick={() => pickAngle(a)}
                className={`text-left rounded-lg border p-3 transition-colors ${
                  a.status === "selected"
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{a.title}</span>
                  {a.status === "selected" && <span className="text-xs text-emerald-600">✓ 已选</span>}
                </div>
                <p className="mt-1 text-sm text-slate-600">{a.premise}</p>
                {a.whyItWorks && (
                  <p className="mt-1 text-xs text-emerald-600/80">{a.whyItWorks}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Tag>{a.cards.structureName}</Tag>
                  <Tag>{a.cards.personaName}</Tag>
                  {a.cards.mashup && <Tag>混搭:{a.cards.mashup}</Tag>}
                </div>
              </button>
            ))}
          </div>
        )}
      </Panel>

      {/* 步骤 2:钩子 */}
      <Panel
        title="② 钩子工厂"
        tone={selectedHook ? "accent" : "default"}
        right={
          selectedAngle ? (
            <Btn onClick={genHooks} disabled={!!busy} variant="ghost">
              {selectedAngle.hooks.length ? "重新生成 12 个钩子" : "生成 12 个钩子"}
            </Btn>
          ) : undefined
        }
      >
        {!selectedAngle ? (
          <p className="text-sm text-slate-500">先在 ① 选择一个角度。</p>
        ) : selectedAngle.hooks.length === 0 ? (
          <p className="text-sm text-slate-500">12 类钩子公式随机抽取,每条独立评分,取 top 5。</p>
        ) : (
          <>
            <div className="space-y-2">
              {(showAllHooks ? selectedAngle.hooks : selectedAngle.hooks.slice(0, 5)).map((h) => (
                <button
                  key={h.id}
                  onClick={() => pickHook(h.id)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    h.selected
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{h.text}</p>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${
                        (h.total ?? 0) >= 8
                          ? "bg-emerald-100 text-emerald-700"
                          : (h.total ?? 0) >= 6
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {(h.total ?? 0).toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {h.hookType}
                    {h.selected && <span className="ml-2 text-emerald-600">✓ 已选</span>}
                  </div>
                </button>
              ))}
            </div>
            {selectedAngle.hooks.length > 5 && (
              <button
                onClick={() => setShowAllHooks(!showAllHooks)}
                className="mt-2 text-xs text-slate-500 hover:text-slate-700"
              >
                {showAllHooks ? "收起" : `查看全部 ${selectedAngle.hooks.length} 条`}
              </button>
            )}
          </>
        )}
      </Panel>

      {/* 步骤 3:大纲 */}
      <Panel
        title="③ 大纲(素材引用锁死)"
        tone={outline?.status === "locked" ? "accent" : "default"}
        right={
          selectedHook ? (
            <Btn onClick={genOutline} disabled={!!busy} variant="ghost">
              {outline ? "重新生成大纲" : "生成大纲"}
            </Btn>
          ) : undefined
        }
      >
        {!selectedHook ? (
          <p className="text-sm text-slate-500">先在 ② 选择一个钩子。已选钩子:{selectedAngle?.hooks.find((h) => h.selected)?.text ?? "无"}</p>
        ) : selectedHook && !outline ? (
          <p className="text-sm text-slate-500">
            将用钩子「{selectedHook.text}」生成分节大纲。必填素材若未被引用会自动重写,直到全部覆盖。
          </p>
        ) : outline ? (
          <>
            <div className="space-y-3">
              {draftSections.map((sec, i) => (
                <div key={i} className="rounded-lg border border-slate-200 bg-white p-3 grid gap-2 md:grid-cols-[90px_110px_1fr_1fr]">
                  <input
                    value={sec.timeRange}
                    onChange={(e) => editOutlineSection(i, "timeRange", e.target.value)}
                    className="rounded bg-slate-50 border border-slate-200 px-2 py-1 text-xs"
                  />
                  <input
                    value={sec.beat}
                    onChange={(e) => editOutlineSection(i, "beat", e.target.value)}
                    className="rounded bg-slate-50 border border-slate-200 px-2 py-1 text-xs"
                  />
                  <input
                    value={sec.summary}
                    onChange={(e) => editOutlineSection(i, "summary", e.target.value)}
                    className="rounded bg-slate-50 border border-slate-200 px-2 py-1 text-sm"
                    placeholder="内容概要"
                  />
                  <input
                    value={sec.direction}
                    onChange={(e) => editOutlineSection(i, "direction", e.target.value)}
                    className="rounded bg-slate-50 border border-slate-200 px-2 py-1 text-sm"
                    placeholder="画面/语气"
                  />
                  <div className="md:col-span-4 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-slate-500">引用素材:</span>
                    {sec.materialRefs.map((ref) => (
                      <Tag key={ref}>
                        {materialById.get(ref)?.slice(0, 24) ?? ref}
                      </Tag>
                    ))}
                    <input
                      value={sec.materialRefs.join(", ")}
                      onChange={(e) => editOutlineSection(i, "materialRefs", e.target.value)}
                      placeholder="素材 id,逗号分隔"
                      className="ml-1 flex-1 rounded bg-slate-50 border border-slate-200 px-2 py-0.5 text-xs text-slate-500"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Btn onClick={lockAndGenScripts} disabled={!!busy}>
                {outline.status === "locked" ? "生成脚本(3 个候选 + 评审)" : "锁定大纲并生成脚本"}
              </Btn>
              {outline.status === "locked" && <span className="text-xs text-emerald-600">大纲已锁定</span>}
            </div>
            {coverage && (
              <p className="mt-2 text-xs text-amber-600">
                ⚠ 自动重写后仍有必填素材未被引用:{coverage.missing.map((id) => materialById.get(id)?.slice(0, 20) ?? id).join("、")},可在上方手动补标注。
              </p>
            )}
          </>
        ) : null}
      </Panel>

      {/* 步骤 4:脚本 */}
      <Panel title={`④ 脚本候选(${scripts.length})`}>
        {!scripts.length ? (
          <p className="text-sm text-slate-500">锁定大纲后生成 3 个脚本候选,每个都会经过六维评审与定向改写。</p>
        ) : (
          <div className="grid gap-6">
            {scripts.map((s, idx) => {
              const review = latestReview(s);
              return (
                <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className="font-semibold">候选 {idx + 1}</span>
                    <Tag>结构:{s.cards.structureName}</Tag>
                    <Tag>人设:{s.cards.personaName}</Tag>
                    {s.cards.mashup && <Tag>混搭:{s.cards.mashup}</Tag>}
                    {s.status === "edited" && <Tag>已人工修改</Tag>}
                    {review && (
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                          review.passed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        均分 {review.avgScore?.toFixed(1)} {review.passed ? "✓ 通过" : "未达标"}
                      </span>
                    )}
                  </div>

                  <p className="mb-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
                    <span className="text-emerald-700 font-medium">钩子:</span> {s.hookText}
                  </p>

                  {review && (
                    <div className="mb-3 grid gap-1 md:grid-cols-2">
                      {Object.entries(review.dimensions).map(([k, v]) => (
                        <ScoreBar key={k} label={k} score={v.score} />
                      ))}
                    </div>
                  )}
                  {review?.findings.length ? (
                    <ul className="mb-3 space-y-1">
                      {review.findings.map((f, i) => (
                        <li key={i} className={`text-xs ${f.startsWith("critical") ? "text-red-600" : "text-slate-500"}`}>
                          {f}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="space-y-2">
                    {(scriptDrafts[s.id] ?? s.segments).map((seg, i) => (
                      <div key={i} className="grid gap-1.5 md:grid-cols-[70px_1fr_1fr_1fr]">
                        <input
                          value={seg.time}
                          onChange={(e) => editSegment(s, i, "time", e.target.value)}
                          className="rounded bg-slate-50 border border-slate-200 px-2 py-1.5 text-xs"
                        />
                        <textarea
                          value={seg.voiceover}
                          onChange={(e) => editSegment(s, i, "voiceover", e.target.value)}
                          rows={1}
                          className="rounded bg-slate-50 border border-slate-200 px-2 py-1.5 text-sm resize-y"
                          placeholder="台词 VO"
                        />
                        <input
                          value={seg.visual}
                          onChange={(e) => editSegment(s, i, "visual", e.target.value)}
                          className="rounded bg-slate-50 border border-slate-200 px-2 py-1.5 text-sm"
                          placeholder="画面"
                        />
                        <input
                          value={seg.onscreenText}
                          onChange={(e) => editSegment(s, i, "onscreenText", e.target.value)}
                          className="rounded bg-slate-50 border border-slate-200 px-2 py-1.5 text-sm"
                          placeholder="屏上字幕"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Btn onClick={() => saveScript(s)} disabled={!!busy}>
                      保存修改
                    </Btn>
                    <Btn onClick={() => reviewScript(s)} disabled={!!busy} variant="ghost">
                      评审 + 定向改写
                    </Btn>
                    <Btn onClick={() => copyScript(s)} variant="ghost">
                      复制纯文本
                    </Btn>
                    <Btn onClick={() => deleteScript(s)} variant="danger">
                      删除
                    </Btn>
                    {savedTip === s.id && <span className="text-xs text-emerald-600">已保存(修改已记录,供微调使用)</span>}
                    {savedTip === "copied" && <span className="text-xs text-emerald-600">已复制</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

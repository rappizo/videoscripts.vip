"use client";

import { useState } from "react";
import { Btn, Panel, ScoreBar } from "./ui";
import type { SerializedHook } from "./types";

const DIMENSION_LABELS: Record<string, string> = {
  specificity: "具体性",
  curiosityGap: "好奇缺口",
  promiseClarity: "承诺清晰",
  first3seconds: "前三秒",
  contentFit: "内容契合",
};

export default function HooksPanel({
  hooks,
  showAll,
  onToggleShowAll,
  disabled,
  spinningId,
  onGenerate,
  onPick,
  onEditText,
  onRegenerate,
}: {
  hooks: SerializedHook[];
  showAll: boolean;
  onToggleShowAll: () => void;
  disabled: boolean;
  spinningId: string | null;
  onGenerate: () => void;
  onPick: (id: string) => void;
  onEditText: (id: string, text: string) => void;
  onRegenerate: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  function startEdit(h: SerializedHook) {
    setEditingId(h.id);
    setEditText(h.text);
  }

  function saveEdit(id: string) {
    if (!editText.trim()) return;
    onEditText(id, editText.trim());
    setEditingId(null);
  }

  return (
    <Panel
      title="② 钩子工厂"
      tone={hooks.some((h) => h.selected) ? "accent" : "default"}
      right={
        <Btn onClick={onGenerate} disabled={disabled} variant="ghost">
          {hooks.length ? "重新生成 12 个钩子" : "生成 12 个钩子"}
        </Btn>
      }
    >
      {hooks.length === 0 ? (
        <p className="text-sm text-slate-500">12 类钩子公式随机抽取,每条独立评分,取 top 5 展示。</p>
      ) : (
        <>
          <div className="space-y-2">
            {(showAll ? hooks : hooks.slice(0, 5)).map((h) => (
              <div
                key={h.id}
                className={`rounded-lg border p-3 transition-colors ${
                  h.selected ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {editingId === h.id ? (
                    <div className="flex-1 flex flex-wrap items-center gap-2">
                      <input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveEdit(h.id)}
                        autoFocus
                        className="flex-1 min-w-48 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm"
                      />
                      <Btn onClick={() => saveEdit(h.id)} variant="ghost" disabled={disabled}>
                        保存
                      </Btn>
                      <Btn onClick={() => setEditingId(null)} variant="subtle">
                        取消
                      </Btn>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => onPick(h.id)} disabled={disabled} className="text-left">
                        <p className="font-medium">{h.text}</p>
                      </button>
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
                    </>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>{h.hookType}</span>
                  {h.selected && <span className="text-emerald-600">✓ 已选</span>}
                  <span className="ml-auto flex gap-3">
                    <button
                      onClick={() => setExpanded(expanded === h.id ? null : h.id)}
                      className="hover:text-emerald-600"
                    >
                      {expanded === h.id ? "收起评分" : "评分明细"}
                    </button>
                    <button
                      onClick={() => startEdit(h)}
                      disabled={disabled}
                      className="hover:text-emerald-600 disabled:opacity-40"
                    >
                      编辑文本
                    </button>
                    <button
                      onClick={() => onRegenerate(h.id)}
                      disabled={disabled}
                      className="hover:text-emerald-600 disabled:opacity-40"
                    >
                      {spinningId === h.id ? "换一条中…" : "换一条"}
                    </button>
                  </span>
                </div>
                {expanded === h.id && (
                  <div className="mt-2 space-y-1.5 rounded-lg bg-slate-50 p-3">
                    {Object.entries(h.scores).map(([k, v]) => (
                      <ScoreBar key={k} label={DIMENSION_LABELS[k] ?? k} score={v} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {hooks.length > 5 && (
            <button onClick={onToggleShowAll} className="mt-2 text-xs text-slate-500 hover:text-slate-700">
              {showAll ? "收起" : `查看全部 ${hooks.length} 条`}
            </button>
          )}
        </>
      )}
    </Panel>
  );
}

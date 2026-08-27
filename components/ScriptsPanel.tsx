"use client";

import { useState } from "react";
import { Btn, Modal, Panel, ScoreBar, Tag } from "./ui";
import type { SerializedScript, SerializedSegment } from "./types";

export type ScriptView = "edit" | "compare" | "ranked";

function latestReviewAvg(s: SerializedScript): number | null {
  const r = s.reviews[s.reviews.length - 1];
  return r?.avgScore ?? null;
}

export default function ScriptsPanel({
  scripts,
  view,
  setView,
  drafts,
  disabled,
  spinningId,
  onEditSegment,
  onSave,
  onReview,
  onCollect,
  onDelete,
  onCopy,
  onExport,
}: {
  scripts: SerializedScript[];
  view: ScriptView;
  setView: (v: ScriptView) => void;
  drafts: Record<string, SerializedSegment[]>;
  disabled: boolean;
  spinningId: string | null;
  onEditSegment: (script: SerializedScript, index: number, field: keyof SerializedSegment, value: string) => void;
  onSave: (s: SerializedScript) => void;
  onReview: (s: SerializedScript, maxRounds: number) => void;
  onCollect: (s: SerializedScript) => void;
  onDelete: (s: SerializedScript) => void;
  onCopy: (s: SerializedScript) => void;
  onExport: (s: SerializedScript, format: "txt" | "srt" | "md") => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState<SerializedScript | null>(null);

  const sorted = [...scripts].sort((a, b) => {
    const av = latestReviewAvg(a);
    const bv = latestReviewAvg(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return bv - av;
  });

  return (
    <Panel
      title={`④ 脚本候选(${scripts.length})`}
      right={
        scripts.length > 0 ? (
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
            {(
              [
                ["edit", "编辑"],
                ["compare", "对比"],
                ["ranked", "排行"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  view === v ? "bg-white shadow-sm text-emerald-700 font-medium" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : undefined
      }
    >
      {!scripts.length ? (
        <p className="text-sm text-slate-500">锁定大纲后生成 3 个脚本候选,每个都会经过六维评审与定向改写。</p>
      ) : view === "compare" ? (
        <div className="grid gap-3 lg:grid-cols-3">
          {scripts.map((s, idx) => {
            const review = s.reviews[s.reviews.length - 1];
            return (
              <div key={s.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold">候选 {idx + 1}</span>
                  {review && (
                    <span
                      className={`rounded px-1.5 py-0.5 font-bold ${
                        review.passed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {review.avgScore?.toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="mb-2 rounded bg-slate-50 px-2 py-1 text-emerald-800">🪝 {s.hookText}</p>
                <div className="space-y-2">
                  {(drafts[s.id] ?? s.segments).map((seg, i) => (
                    <div key={i} className="rounded border border-slate-100 p-1.5">
                      <p className="text-slate-400">{seg.time}</p>
                      <p className="font-medium">{seg.voiceover}</p>
                      <p className="text-slate-500">画面:{seg.visual}</p>
                      {seg.onscreenText && <p className="text-slate-500">字幕:{seg.onscreenText}</p>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : view === "ranked" ? (
        <div className="space-y-2">
          {sorted.map((s, idx) => {
            const review = s.reviews[s.reviews.length - 1];
            return (
              <div key={s.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-lg font-bold text-slate-300">#{idx + 1}</span>
                {review && (
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${
                      review.passed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    均分 {review.avgScore?.toFixed(1)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.hookText}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Tag>结构:{s.cards.structureName}</Tag>
                    <Tag>人设:{s.cards.personaName}</Tag>
                  </div>
                </div>
                <Btn variant="ghost" onClick={() => setView("edit")}>
                  编辑
                </Btn>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-6">
          {scripts.map((s, idx) => {
            const review = s.reviews[s.reviews.length - 1];
            return (
              <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center gap-3">
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

                <p className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-medium text-emerald-700">钩子:</span> {s.hookText}
                </p>

                {review && (
                  <div className="mb-3 grid gap-1 md:grid-cols-2">
                    {Object.entries(review.dimensions).map(([k, v]) => (
                      <ScoreBar key={k} label={k} score={v.score} />
                    ))}
                  </div>
                )}
                {review && review.findings.length > 0 && (
                  <ul className="mb-3 space-y-1">
                    {review.findings.map((f, i) => (
                      <li key={i} className={`text-xs ${f.startsWith("critical") ? "text-red-600" : "text-slate-500"}`}>
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
                {s.reviews.length > 1 && (
                  <p className="mb-3 text-xs text-slate-500">
                    评审轨迹:{s.reviews.map((r) => r.avgScore?.toFixed(1) ?? "?").join(" → ")}
                    {s.status === "approved" && <span className="ml-2 text-emerald-600">已收藏到案例库</span>}
                  </p>
                )}
                {s.status === "approved" && s.reviews.length <= 1 && (
                  <p className="mb-3 text-xs text-emerald-600">已收藏到案例库</p>
                )}

                <div className="space-y-2">
                  {(drafts[s.id] ?? s.segments).map((seg, i) => (
                    <div key={i} className="grid gap-1.5 md:grid-cols-[70px_1fr_1fr_1fr]">
                      <input
                        value={seg.time}
                        onChange={(e) => onEditSegment(s, i, "time", e.target.value)}
                        className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs"
                      />
                      <textarea
                        value={seg.voiceover}
                        onChange={(e) => onEditSegment(s, i, "voiceover", e.target.value)}
                        rows={1}
                        className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm resize-y"
                        placeholder="台词 VO"
                      />
                      <input
                        value={seg.visual}
                        onChange={(e) => onEditSegment(s, i, "visual", e.target.value)}
                        className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm"
                        placeholder="画面"
                      />
                      <input
                        value={seg.onscreenText}
                        onChange={(e) => onEditSegment(s, i, "onscreenText", e.target.value)}
                        className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm"
                        placeholder="屏上字幕"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Btn onClick={() => onSave(s)} disabled={disabled}>
                    保存修改
                  </Btn>
                  <Btn onClick={() => onReview(s, 0)} disabled={disabled} variant="ghost">
                    {spinningId === s.id ? "评审中…" : "评审一次"}
                  </Btn>
                  <Btn onClick={() => onReview(s, 3)} disabled={disabled} variant="ghost">
                    自动迭代至通过
                  </Btn>
                  <Btn onClick={() => onCollect(s)} disabled={disabled || s.status === "approved"} variant="ghost">
                    {s.status === "approved" ? "已收藏 ✓" : "收藏到案例库"}
                  </Btn>
                  <Btn onClick={() => onCopy(s)} variant="ghost">
                    复制纯文本
                  </Btn>
                  <span className="text-xs text-slate-300">|</span>
                  <Btn onClick={() => onExport(s, "txt")} variant="subtle">
                    .txt
                  </Btn>
                  <Btn onClick={() => onExport(s, "srt")} variant="subtle">
                    .srt
                  </Btn>
                  <Btn onClick={() => onExport(s, "md")} variant="subtle">
                    .md
                  </Btn>
                  <span className="ml-auto">
                    <Btn onClick={() => setConfirmDelete(s)} variant="danger">
                      删除
                    </Btn>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={confirmDelete !== null} title="删除脚本" onClose={() => setConfirmDelete(null)}>
        <p className="text-sm text-slate-600">确定删除该脚本候选?此操作不可撤销。</p>
        <div className="mt-4 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>
            取消
          </Btn>
          <Btn
            variant="danger"
            onClick={() => {
              if (confirmDelete) onDelete(confirmDelete);
              setConfirmDelete(null);
            }}
          >
            删除
          </Btn>
        </div>
      </Modal>
    </Panel>
  );
}

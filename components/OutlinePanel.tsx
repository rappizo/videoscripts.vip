"use client";

import { Btn, Panel, Tag } from "./ui";
import type { OutlineSection, SerializedOutline } from "./types";

export default function OutlinePanel({
  outline,
  draftSections,
  selectedHookText,
  disabled,
  coverage,
  materialById,
  onEditSection,
  onGenerate,
  onLockAndGen,
}: {
  outline: SerializedOutline | null;
  draftSections: OutlineSection[];
  selectedHookText: string | null;
  disabled: boolean;
  coverage: { coverageOk: boolean; missing: string[] } | null;
  materialById: Map<string, string>;
  onEditSection: (index: number, field: keyof OutlineSection, value: string) => void;
  onGenerate: () => void;
  onLockAndGen: () => void;
}) {
  return (
    <Panel
      title="③ 大纲(素材引用锁死)"
      tone={outline?.status === "locked" ? "accent" : "default"}
      right={
        selectedHookText ? (
          <Btn onClick={onGenerate} disabled={disabled} variant="ghost">
            {outline ? "重新生成大纲" : "生成大纲"}
          </Btn>
        ) : undefined
      }
    >
      {!selectedHookText ? (
        <p className="text-sm text-slate-500">先在 ② 选择一个钩子。已选钩子:无</p>
      ) : !outline ? (
        <p className="text-sm text-slate-500">
          将用钩子「{selectedHookText}」生成分节大纲。必填素材若未被引用会自动重写,直到全部覆盖。
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {draftSections.map((sec, i) => (
              <div
                key={i}
                className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[90px_110px_1fr_1fr]"
              >
                <input
                  value={sec.timeRange}
                  onChange={(e) => onEditSection(i, "timeRange", e.target.value)}
                  className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
                />
                <input
                  value={sec.beat}
                  onChange={(e) => onEditSection(i, "beat", e.target.value)}
                  className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
                />
                <input
                  value={sec.summary}
                  onChange={(e) => onEditSection(i, "summary", e.target.value)}
                  className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm"
                  placeholder="内容概要"
                />
                <input
                  value={sec.direction}
                  onChange={(e) => onEditSection(i, "direction", e.target.value)}
                  className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm"
                  placeholder="画面/语气"
                />
                <div className="flex flex-wrap items-center gap-1.5 md:col-span-4">
                  <span className="text-xs text-slate-500">引用素材:</span>
                  {sec.materialRefs.map((ref) => (
                    <Tag key={ref}>{materialById.get(ref)?.slice(0, 24) ?? ref}</Tag>
                  ))}
                  <input
                    value={sec.materialRefs.join(", ")}
                    onChange={(e) => onEditSection(i, "materialRefs", e.target.value)}
                    placeholder="素材 id,逗号分隔"
                    className="ml-1 flex-1 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Btn onClick={onLockAndGen} disabled={disabled}>
              {outline.status === "locked" ? "生成脚本(3 个候选 + 评审)" : "锁定大纲并生成脚本"}
            </Btn>
            {outline.status === "locked" && <span className="text-xs text-emerald-600">大纲已锁定</span>}
          </div>
          {coverage && (
            <p className="mt-2 text-xs text-amber-600">
              ⚠ 自动重写后仍有必填素材未被引用:
              {coverage.missing.map((id) => materialById.get(id)?.slice(0, 20) ?? id).join("、")}
              ,可在上方手动补标注。
            </p>
          )}
        </>
      )}
    </Panel>
  );
}

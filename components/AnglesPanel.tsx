"use client";

import { useState } from "react";
import { Btn, Modal, Panel, Tag } from "./ui";
import type { SerializedAngle } from "./types";

export default function AnglesPanel({
  angles,
  disabled,
  spinningId,
  onGenerate,
  onPick,
  onRegenerate,
}: {
  angles: SerializedAngle[];
  disabled: boolean;
  spinningId: string | null;
  onGenerate: () => void;
  onPick: (angle: SerializedAngle) => void;
  onRegenerate: (angle: SerializedAngle) => void;
}) {
  const [confirmRegen, setConfirmRegen] = useState<SerializedAngle | null>(null);

  return (
    <Panel
      title="① 内容角度"
      tone={angles.some((a) => a.status === "selected") ? "accent" : "default"}
      right={
        <Btn onClick={onGenerate} disabled={disabled} variant="ghost">
          {angles.length ? "重新生成 2 个角度" : "生成 2 个角度"}
        </Btn>
      }
    >
      {angles.length === 0 ? (
        <p className="text-sm text-slate-500">
          每个角度会随机抽取一套创意牌(叙事结构 × 创作者人设 × 开场方式 × 情绪曲线),避免套路化。
        </p>
      ) : (
        <div className="grid gap-3">
          {angles.map((a) => (
            <div
              key={a.id}
              className={`rounded-lg border transition-colors ${
                a.status === "selected"
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="grid gap-3 p-3 md:grid-cols-2">
                {/* 左:方案原文 */}
                <button onClick={() => onPick(a)} disabled={disabled} className="w-full text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{a.title}</span>
                    {a.status === "selected" && <span className="text-xs text-emerald-600">✓ 已选</span>}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{a.premise}</p>
                  {a.whyItWorks && <p className="mt-1 text-xs text-emerald-600/80">{a.whyItWorks}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Tag>{a.cards.structureName}</Tag>
                    <Tag>{a.cards.personaName}</Tag>
                    {a.cards.mashup && <Tag>混搭:{a.cards.mashup}</Tag>}
                  </div>
                </button>
                {/* 右:中文解析 */}
                {a.explanationZh ? (
                  <div className="rounded-lg bg-emerald-50/60 p-3 md:border-l md:border-emerald-100">
                    <p className="text-xs font-medium text-emerald-600">中文解析</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">{a.explanationZh}</p>
                  </div>
                ) : (
                  <div className="hidden md:block" />
                )}
              </div>
              <div className="flex justify-end border-t border-slate-100 px-3 py-1.5">
                <button
                  onClick={() => setConfirmRegen(a)}
                  disabled={disabled}
                  className="text-xs text-slate-400 hover:text-emerald-600 disabled:opacity-40"
                >
                  {spinningId === a.id ? "换一条中…" : "换一条"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={confirmRegen !== null} title="换一个角度" onClose={() => setConfirmRegen(null)}>
        <p className="text-sm text-slate-600">
          将重新生成并替换该角度的内容。
          {confirmRegen && (confirmRegen.hooks.length > 0 || confirmRegen.status === "selected") && (
            <span className="mt-2 block text-xs text-amber-600">
              ⚠ 该角度已有关联钩子,重新生成后旧钩子会被清除。
            </span>
          )}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setConfirmRegen(null)}>
            取消
          </Btn>
          <Btn
            onClick={() => {
              if (confirmRegen) onRegenerate(confirmRegen);
              setConfirmRegen(null);
            }}
          >
            换一条
          </Btn>
        </div>
      </Modal>
    </Panel>
  );
}

"use client";

import { useState } from "react";
import { Btn, Modal, Panel } from "./ui";
import type { SerializedMaterial } from "./types";

const MATERIAL_TYPES: Record<string, string> = {
  fact: "事实",
  data: "数据",
  quote: "金句",
  feature: "卖点",
  keyword: "关键词",
  story: "故事",
};

export default function MaterialsPanel({
  materials,
  referencedIds,
  disabled,
  onAdd,
  onUpdate,
  onDelete,
}: {
  materials: SerializedMaterial[];
  referencedIds: Set<string>;
  disabled: boolean;
  onAdd: (type: string, content: string, isRequired: boolean) => void;
  onUpdate: (id: string, patch: { type?: string; content?: string; isRequired?: boolean }) => void;
  onDelete: (id: string) => void;
}) {
  const [type, setType] = useState("feature");
  const [content, setContent] = useState("");
  const [required, setRequired] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editType, setEditType] = useState("feature");
  const [editRequired, setEditRequired] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function add() {
    if (!content.trim() || disabled) return;
    onAdd(type, content.trim(), required);
    setContent("");
    setRequired(true);
  }

  function startEdit(m: SerializedMaterial) {
    setEditing(m.id);
    setEditContent(m.content);
    setEditType(m.type);
    setEditRequired(m.isRequired);
  }

  function saveEdit(id: string) {
    if (!editContent.trim()) return;
    onUpdate(id, { type: editType, content: editContent.trim(), isRequired: editRequired });
    setEditing(null);
  }

  return (
    <Panel
      title={`素材(${materials.length})— 会在脚本中被强制引用`}
      right={
        <Btn onClick={add} disabled={disabled || !content.trim()} variant="ghost">
          + 添加素材
        </Btn>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm"
        >
          {Object.entries(MATERIAL_TYPES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="输入素材内容,如:采用 316 不锈钢内胆…"
          className="flex-1 min-w-40 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-emerald-500 focus:bg-white"
        />
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
          必用
        </label>
      </div>

      {materials.length ? (
        <div className="space-y-2">
          {materials.map((m) => (
            <div key={m.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              {editing === m.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="rounded border border-slate-200 bg-slate-50 px-1.5 py-1 text-xs"
                  >
                    {Object.entries(MATERIAL_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <input
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="flex-1 min-w-40 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm"
                  />
                  <label className="flex items-center gap-1 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      checked={editRequired}
                      onChange={(e) => setEditRequired(e.target.checked)}
                    />
                    必用
                  </label>
                  <Btn onClick={() => saveEdit(m.id)} disabled={disabled} variant="ghost">
                    保存
                  </Btn>
                  <Btn onClick={() => setEditing(null)} variant="subtle">
                    取消
                  </Btn>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400">{MATERIAL_TYPES[m.type] ?? m.type}</span>
                  {m.isRequired && <span className="text-xs text-amber-600">必用</span>}
                  {referencedIds.has(m.id) && <span className="text-xs text-emerald-600">已被大纲引用</span>}
                  <span className="text-sm">{m.content}</span>
                  <span className="ml-auto flex gap-2">
                    <button
                      onClick={() => startEdit(m)}
                      disabled={disabled}
                      className="text-xs text-slate-400 hover:text-emerald-600 disabled:opacity-40"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => setConfirmDelete(m.id)}
                      disabled={disabled}
                      className="text-xs text-slate-400 hover:text-red-600 disabled:opacity-40"
                    >
                      删除
                    </button>
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">未录入素材。素材越多,脚本越有据可依。</p>
      )}

      <Modal open={confirmDelete !== null} title="删除素材" onClose={() => setConfirmDelete(null)}>
        <p className="text-sm text-slate-600">
          确定删除该素材?
          {confirmDelete && referencedIds.has(confirmDelete) && (
            <span className="mt-2 block text-xs text-amber-600">
              ⚠ 该素材已被大纲引用,删除后大纲引用点会失效。
            </span>
          )}
        </p>
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

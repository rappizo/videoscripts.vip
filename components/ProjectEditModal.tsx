"use client";

import { useState } from "react";
import { Btn, Modal } from "./ui";
import type { ProjectDetail } from "./types";

export interface ProjectEditValues {
  topic: string;
  audience: string;
  durationSec: number;
  goal: string;
  style: string;
  platform: string;
  language: string;
  description: string;
}

export default function ProjectEditModal({
  open,
  initial,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: ProjectDetail;
  busy: boolean;
  onClose: () => void;
  onSave: (values: ProjectEditValues) => void;
}) {
  const [values, setValues] = useState<ProjectEditValues>(() => fromProject(initial));

  function set<K extends keyof ProjectEditValues>(key: K, value: ProjectEditValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Modal open={open} title="编辑项目" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-500">选题 Topic *</label>
          <input
            value={values.topic}
            onChange={(e) => set("topic", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:bg-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500">时长(秒)</label>
            <input
              type="number"
              min={10}
              max={180}
              value={values.durationSec}
              onChange={(e) => set("durationSec", Number(e.target.value) || 30)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">目标受众</label>
            <input
              value={values.audience}
              onChange={(e) => set("audience", e.target.value)}
              placeholder="e.g. moms 25-40"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-500">平台</label>
            <input
              value={values.platform}
              onChange={(e) => set("platform", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">语言</label>
            <input
              value={values.language}
              onChange={(e) => set("language", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">目标</label>
            <input
              value={values.goal}
              onChange={(e) => set("goal", e.target.value)}
              placeholder="e.g. conversions"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500">风格偏好</label>
          <input
            value={values.style}
            onChange={(e) => set("style", e.target.value)}
            placeholder="e.g. casual, fast-paced"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">背景说明</label>
          <textarea
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 resize-y"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>
            取消
          </Btn>
          <Btn onClick={() => onSave(values)} disabled={busy || !values.topic.trim()}>
            {busy ? "保存中…" : "保存"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function fromProject(p: ProjectDetail): ProjectEditValues {
  return {
    topic: p.topic,
    audience: p.audience,
    durationSec: p.durationSec,
    goal: p.goal,
    style: p.style,
    platform: p.platform ?? "tiktok",
    language: p.language ?? "English",
    description: p.description,
  };
}

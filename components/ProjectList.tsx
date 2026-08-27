"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Btn, Modal, Tag } from "./ui";
import type { ProjectSummary } from "./types";

type Filter = "all" | "active" | "archived";

export default function ProjectList({ projects }: { projects: ProjectSummary[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("active");
  const [confirmDelete, setConfirmDelete] = useState<ProjectSummary | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const visible = useMemo(() => {
    let list = projects.filter((p) => {
      if (filter === "active") return !p.archivedAt;
      if (filter === "archived") return !!p.archivedAt;
      return true;
    });
    const kw = q.trim().toLowerCase();
    if (kw) {
      list = list.filter(
        (p) =>
          p.topic.toLowerCase().includes(kw) ||
          (p.niche ?? "").toLowerCase().includes(kw) ||
          (p.audience ?? "").toLowerCase().includes(kw) ||
          (p.selectedAngle ?? "").toLowerCase().includes(kw)
      );
    }
    return [...list].sort((a, b) => {
      if (a.starred !== b.starred) return a.starred ? -1 : 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [projects, q, filter]);

  const counts = useMemo(
    () => ({
      all: projects.length,
      active: projects.filter((p) => !p.archivedAt).length,
      archived: projects.filter((p) => !!p.archivedAt).length,
    }),
    [projects]
  );

  async function patch(p: ProjectSummary, body: Record<string, unknown>) {
    setBusyId(p.id);
    try {
      await fetch(`/api/projects/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(p: ProjectSummary) {
    setBusyId(p.id);
    try {
      await fetch(`/api/projects/${p.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索项目名 / 品类 / 受众…"
          className="w-64 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
        />
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
          {(
            [
              ["active", `进行中(${counts.active})`],
              ["archived", `已归档(${counts.archived})`],
              ["all", `全部(${counts.all})`],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                filter === v ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!visible.length ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          {projects.length ? "没有符合条件的项目。" : "还没有项目。在上方输入产品名生成方案后开工。"}
        </div>
      ) : (
        visible.map((p) => (
          <div key={p.id} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
            <button
              onClick={() => patch(p, { starred: !p.starred })}
              disabled={busyId === p.id}
              className={`text-lg ${p.starred ? "text-amber-400" : "text-slate-300 hover:text-amber-400"}`}
              title={p.starred ? "取消置顶" : "置顶"}
            >
              {p.starred ? "★" : "☆"}
            </button>
            <div className="min-w-0 flex-1">
              <Link href={`/project/${p.id}`} className="font-medium hover:text-emerald-600 transition-colors">
                {p.topic}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Tag>{p.niche || "未分类"}</Tag>
                <Tag>{p.durationSec}s</Tag>
                {p.audience && <Tag>{p.audience}</Tag>}
                {p.archivedAt && <Tag>已归档</Tag>}
                <span className="text-xs text-slate-500">
                  素材 {p.materialCount} · 角度 {p.angleCount} · 钩子 {p.hookCount} · 脚本 {p.scriptCount}
                  {p.selectedAngle ? ` · 已选:「${p.selectedAngle}」` : ""}
                  {p.hasOutline ? " · 大纲已锁定" : ""}
                </span>
              </div>
            </div>
            <Btn variant="ghost" onClick={() => router.push(`/project/${p.id}`)}>
              打开
            </Btn>
            <Btn variant="ghost" onClick={() => patch(p, { archived: !p.archivedAt })} disabled={busyId === p.id}>
              {p.archivedAt ? "恢复" : "归档"}
            </Btn>
            <Btn variant="danger" onClick={() => setConfirmDelete(p)} disabled={busyId === p.id}>
              删除
            </Btn>
          </div>
        ))
      )}

      <Modal open={confirmDelete !== null} title="删除项目" onClose={() => setConfirmDelete(null)}>
        <p className="text-sm text-slate-600">
          确定删除「{confirmDelete?.topic}」及其全部角度、钩子、大纲与脚本?此操作不可撤销。
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>
            取消
          </Btn>
          <Btn
            variant="danger"
            onClick={() => {
              if (confirmDelete) void remove(confirmDelete);
              setConfirmDelete(null);
            }}
          >
            删除
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

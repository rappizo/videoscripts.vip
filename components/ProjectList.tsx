"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Btn, Tag } from "./ui";
import type { ProjectSummary } from "./types";

export default function ProjectList({ projects }: { projects: ProjectSummary[] }) {
  const router = useRouter();

  async function remove(id: string) {
    if (!confirm("删除该项目及其全部脚本?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    router.refresh();
  }

  if (!projects.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
        还没有项目。在上方输入产品名生成方案后开工。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {projects.map((p) => (
        <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <Link href={`/project/${p.id}`} className="font-medium hover:text-emerald-600 transition-colors">
              {p.topic}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Tag>{p.niche || "未分类"}</Tag>
              <Tag>{p.durationSec}s</Tag>
              {p.audience && <Tag>{p.audience}</Tag>}
              <span className="text-xs text-slate-500">
                素材 {p.materialCount} · 角度 {p.angleCount}
                {p.selectedAngle ? ` · 已选:「${p.selectedAngle}」` : ""}
                {p.hasOutline ? " · 大纲已锁定" : ""}
              </span>
            </div>
          </div>
          <Btn variant="ghost" onClick={() => router.push(`/project/${p.id}`)}>
            打开
          </Btn>
          <Btn variant="danger" onClick={() => remove(p.id)}>
            删除
          </Btn>
        </div>
      ))}
    </div>
  );
}

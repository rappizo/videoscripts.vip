import Link from "next/link";
import { prisma } from "@/lib/db";
import { pageUid, projectScope } from "@/lib/access";
import ProjectList from "@/components/ProjectList";
import type { ProjectSummary } from "@/components/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const uid = await pageUid();
  const projects = await prisma.project.findMany({
    where: projectScope(uid),
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { angles: true, materials: true } },
      angles: {
        select: { status: true, title: true, _count: { select: { hooks: true } }, outline: { select: { status: true, _count: { select: { scripts: true } } } } },
      },
    },
  });

  const summaries: ProjectSummary[] = projects.map((p) => ({
    id: p.id,
    topic: p.topic,
    niche: p.niche,
    audience: p.audience,
    durationSec: p.durationSec,
    productName: p.productName,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    materialCount: p._count.materials,
    angleCount: p._count.angles,
    selectedAngle: p.angles.find((a) => a.status === "selected")?.title ?? null,
    hasOutline: p.angles.some((a) => a.outline?.status === "locked"),
    scriptCount: p.angles.reduce((acc, a) => acc + (a.outline?._count.scripts ?? 0), 0),
    hookCount: p.angles.reduce((acc, a) => acc + a._count.hooks, 0),
    starred: p.starred,
    archivedAt: p.archivedAt?.toISOString() ?? null,
  }));

  const activeCount = summaries.filter((p) => !p.archivedAt).length;
  const draftCount = summaries.filter((p) => !p.archivedAt && p.status === "draft").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* 头部:品牌 + 新建项目入口 */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-slate-400 bg-clip-text text-transparent">
              短视频脚本 AI 工作室
            </span>
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            专为产品宣传视频:反套路创意牌 × 钩子工厂 × 素材锁定 × 六维评审改写
          </p>
        </div>
        <Link
          href="/project/new"
          className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
        >
          ＋ 新建项目
        </Link>
      </div>

      {/* 项目面板 */}
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold">我的项目</h2>
          <span className="text-sm text-slate-500">
            共 {summaries.length} 个 · 进行中 {activeCount} · 草稿 {draftCount}
          </span>
        </div>
        <ProjectList projects={summaries} />
      </section>
    </div>
  );
}

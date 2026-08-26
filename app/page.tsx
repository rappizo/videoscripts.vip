import { prisma } from "@/lib/db";
import CreateProjectForm from "@/components/CreateProjectForm";
import ProjectList from "@/components/ProjectList";
import type { ProjectSummary } from "@/components/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { angles: true, materials: true } },
      angles: {
        select: { status: true, title: true, outline: { select: { status: true } } },
      },
    },
  });

  const summaries: ProjectSummary[] = projects.map((p) => ({
    id: p.id,
    topic: p.topic,
    niche: p.niche,
    audience: p.audience,
    durationSec: p.durationSec,
    createdAt: p.createdAt.toISOString(),
    materialCount: p._count.materials,
    angleCount: p._count.angles,
    selectedAngle: p.angles.find((a) => a.status === "selected")?.title ?? null,
    hasOutline: p.angles.some((a) => a.outline?.status === "locked"),
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-xl font-bold mb-6">项目</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_400px] items-start">
        <ProjectList projects={summaries} />
        <CreateProjectForm />
      </div>
    </div>
  );
}

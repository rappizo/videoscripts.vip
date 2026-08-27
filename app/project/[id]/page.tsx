import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ownsProject, pageUid } from "@/lib/access";
import Workbench from "@/components/Workbench";
import type { ProjectDetail } from "@/components/types";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await pageUid();
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      materials: true,
      angles: {
        orderBy: { createdAt: "asc" },
        include: {
          hooks: { orderBy: [{ selected: "desc" }, { total: "desc" }] },
          outline: {
            include: { scripts: { orderBy: { createdAt: "asc" }, include: { reviews: { orderBy: { createdAt: "asc" } } } } },
          },
        },
      },
    },
  });
  if (!project || !ownsProject(uid, project.userId)) notFound();

  const stats = await prisma.job.aggregate({
    where: { projectId: id, status: "succeeded" },
    _sum: { tokensIn: true, tokensOut: true, costUsd: true },
    _count: true,
  });

  const data: ProjectDetail = {
    id: project.id,
    topic: project.topic,
    description: project.description,
    niche: project.niche,
    audience: project.audience,
    durationSec: project.durationSec,
    style: project.style,
    goal: project.goal,
    platform: project.platform,
    language: project.language,
    stats: {
      jobCount: stats._count,
      tokensIn: stats._sum.tokensIn ?? 0,
      tokensOut: stats._sum.tokensOut ?? 0,
      costUsd: stats._sum.costUsd ?? 0,
    },
    materials: project.materials.map((m) => ({
      id: m.id,
      type: m.type,
      content: m.content,
      isRequired: m.isRequired,
    })),
    angles: project.angles.map((a) => ({
      id: a.id,
      title: a.title,
      premise: a.premise,
      whyItWorks: a.whyItWorks,
      explanationZh: a.explanationZh,
      status: a.status,
      cards: JSON.parse(a.cards),
      hooks: a.hooks.map((h) => ({
        id: h.id,
        text: h.text,
        hookType: h.hookType,
        total: h.total,
        scores: JSON.parse(h.scores),
        selected: h.selected,
      })),
      outline: a.outline
        ? {
            id: a.outline.id,
            status: a.outline.status,
            sections: JSON.parse(a.outline.sections),
            scripts: a.outline.scripts.map((s) => ({
              id: s.id,
              hookText: s.hookText,
              segments: JSON.parse(s.segments),
              status: s.status,
              cards: JSON.parse(s.cards),
              reviews: s.reviews.map((r) => ({
                id: r.id,
                dimensions: JSON.parse(r.dimensions),
                avgScore: r.avgScore,
                passed: r.passed,
                findings: JSON.parse(r.findings),
                attempt: r.attempt,
              })),
            })),
          }
        : null,
    })),
  };

  return <Workbench initial={data} />;
}

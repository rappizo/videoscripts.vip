import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Workbench from "@/components/Workbench";
import type { ProjectDetail } from "@/components/types";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  if (!project) notFound();

  const data: ProjectDetail = {
    id: project.id,
    topic: project.topic,
    description: project.description,
    niche: project.niche,
    audience: project.audience,
    durationSec: project.durationSec,
    style: project.style,
    goal: project.goal,
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

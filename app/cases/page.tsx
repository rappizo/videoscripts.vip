import { prisma } from "@/lib/db";
import { seedCasesIfEmpty } from "@/lib/cases";
import { Tag } from "@/components/ui";

export const dynamic = "force-dynamic";

function parseTags(raw: string): Record<string, string> {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export default async function CasesPage() {
  await seedCasesIfEmpty();
  const cases = await prisma.case.findMany({ orderBy: [{ category: "asc" }, { createdAt: "asc" }] });
  const hooks = cases.filter((c) => c.category === "hook");
  const structures = cases.filter((c) => c.category === "structure");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-xl font-bold mb-2">内置案例库</h1>
      <p className="text-sm text-slate-500 mb-6">
        冷启动 few-shot 语料:按品类检索匹配案例注入生成过程。被采纳的脚本会逐步沉淀成你自己的语料。
      </p>
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-semibold mb-3">钩子样例({hooks.length})</h2>
          <div className="space-y-2">
            {hooks.map((c) => {
              const tags = parseTags(c.tags);
              return (
                <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-sm">{c.content}</p>
                  <div className="mt-1.5 flex gap-1.5">
                    <Tag>{tags.niche}</Tag>
                    <Tag>{tags.hookType}</Tag>
                    <Tag>{tags.emotion}</Tag>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <h2 className="font-semibold mb-3">结构样例({structures.length})</h2>
          <div className="space-y-2">
            {structures.map((c) => {
              const tags = parseTags(c.tags);
              return (
                <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-sm">{c.content}</p>
                  <p className="mt-1.5 text-xs text-slate-500">{tags.beatFlow}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

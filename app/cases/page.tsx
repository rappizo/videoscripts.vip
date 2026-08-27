import { prisma } from "@/lib/db";
import { seedCasesIfEmpty } from "@/lib/cases";
import { MASTER_UID, pageUid } from "@/lib/access";
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
  const uid = await pageUid();
  const cases = await prisma.case.findMany({ orderBy: [{ category: "asc" }, { createdAt: "asc" }] });
  const hooks = cases.filter((c) => c.category === "hook");
  const structures = cases.filter((c) => c.category === "structure");
  // 我的脚本收藏:普通用户只看自己的,主账号/免登录看全部
  const scripts = cases.filter((c) => c.category === "script" && (uid === MASTER_UID || !uid || c.userId === uid));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-xl font-bold mb-2">内置案例库</h1>
      <p className="text-sm text-slate-500 mb-6">
        冷启动 few-shot 语料:按品类检索匹配案例注入生成过程。被采纳的脚本会逐步沉淀成你自己的语料。
      </p>
      <div className="grid gap-8 lg:grid-cols-3">
        <div>
          <h2 className="font-semibold mb-3">钩子样例({hooks.length})</h2>
          <div className="space-y-2">
            {hooks.map((c) => {
              const tags = parseTags(c.tags);
              return (
                <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-sm">{c.content}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Tag>{tags.niche}</Tag>
                    <Tag>{tags.hookType}</Tag>
                    <Tag>{tags.emotion}</Tag>
                    {c.usageCount > 0 && <Tag>引用 {c.usageCount} 次</Tag>}
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
        <div>
          <h2 className="font-semibold mb-3">我的脚本收藏({scripts.length})</h2>
          <div className="space-y-2">
            {scripts.length ? (
              scripts.map((c) => {
                const tags = parseTags(c.tags);
                return (
                  <div key={c.id} className="rounded-lg border border-emerald-200 bg-white p-3">
                    <p className="whitespace-pre-wrap text-xs text-slate-700">{c.content}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {tags.niche && <Tag>{tags.niche}</Tag>}
                      {tags.emotion && <Tag>{tags.emotion}</Tag>}
                      {tags.structure && <Tag>{tags.structure}</Tag>}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">
                还没有收藏。在脚本候选里点「收藏到案例库」,让好脚本沉淀为你的专属语料。
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

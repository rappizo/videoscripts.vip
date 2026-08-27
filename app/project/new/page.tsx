import Link from "next/link";
import BriefFlow from "@/components/BriefFlow";

export const dynamic = "force-dynamic";

// 新建项目:填产品 → 生成方案(即建项目草稿) → 选定方案开工
export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
      <Link href="/" className="inline-block text-sm text-slate-500 hover:text-slate-700">
        ← 返回我的项目
      </Link>
      <BriefFlow />
    </div>
  );
}

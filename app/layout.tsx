import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "VideoScripts — 短视频脚本工作室",
  description: "面向 TikTok 短视频的五阶段 AI 脚本流水线",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur sticky top-0 z-20">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-6">
            <Link href="/" className="font-bold text-lg tracking-tight">
              <span className="text-violet-400">Video</span>Scripts
            </Link>
            <nav className="flex gap-4 text-sm text-zinc-400">
              <Link href="/" className="hover:text-zinc-100 transition-colors">
                项目
              </Link>
              <Link href="/cases" className="hover:text-zinc-100 transition-colors">
                案例库
              </Link>
              <Link href="/diagnose" className="hover:text-zinc-100 transition-colors">
                模型诊断
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}

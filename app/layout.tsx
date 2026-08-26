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
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white/85 backdrop-blur sticky top-0 z-20">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-6">
            <Link href="/" className="font-bold text-lg tracking-tight">
              <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-slate-400 bg-clip-text text-transparent">
                VideoScripts
              </span>
            </Link>
            <nav className="flex gap-4 text-sm text-slate-500">
              <Link href="/" className="hover:text-slate-900 transition-colors">
                项目
              </Link>
              <Link href="/cases" className="hover:text-slate-900 transition-colors">
                案例库
              </Link>
              <Link href="/diagnose" className="hover:text-slate-900 transition-colors">
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

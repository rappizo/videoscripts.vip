"use client";

import type { ReactNode } from "react";

export function Btn({
  children,
  onClick,
  variant = "primary",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "subtle";
  disabled?: boolean;
  className?: string;
}) {
  const styles: Record<string, string> = {
    primary:
      "bg-violet-600 hover:bg-violet-500 text-white disabled:bg-zinc-800 disabled:text-zinc-500",
    ghost:
      "border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800 text-zinc-200 disabled:opacity-40",
    danger: "text-red-400 border border-red-900/60 hover:bg-red-950/40 disabled:opacity-40",
    subtle: "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 disabled:opacity-40",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Panel({
  title,
  children,
  right,
  tone = "default",
}: {
  title?: ReactNode;
  children: ReactNode;
  right?: ReactNode;
  tone?: "default" | "accent";
}) {
  return (
    <section
      className={`rounded-xl border p-4 ${
        tone === "accent" ? "border-violet-700/60 bg-violet-950/20" : "border-zinc-800 bg-zinc-900/60"
      }`}
    >
      {(title || right) && (
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-semibold text-sm text-zinc-200">{title}</h3>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-violet-300">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
      {label ?? "生成中…"}
    </span>
  );
}

export function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 8 ? "bg-emerald-500" : score >= 6 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 shrink-0 text-zinc-500 truncate">{label}</span>
      <div className="h-1.5 flex-1 rounded bg-zinc-800">
        <div className={`h-1.5 rounded ${color}`} style={{ width: `${score * 10}%` }} />
      </div>
      <span className="w-6 text-right tabular-nums text-zinc-300">{score}</span>
    </div>
  );
}

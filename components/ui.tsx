"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

// ---------- Toast ----------

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  text: string;
}

const ToastCtx = createContext<{ push: (kind: ToastKind, text: string) => void }>({
  push: () => {},
});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const push = useCallback((kind: ToastKind, text: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, kind, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 w-80 max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg border px-4 py-2.5 text-sm shadow-lg ${
              t.kind === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : t.kind === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- Modal ----------

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative rounded-xl bg-white shadow-xl w-full max-w-lg max-h-[85vh] overflow-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Btn({
  children,
  onClick,
  variant = "primary",
  disabled,
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "subtle";
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const styles: Record<string, string> = {
    primary:
      "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-sm disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none",
    ghost:
      "border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 disabled:opacity-40",
    danger: "text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-40",
    subtle: "text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
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
        tone === "accent"
          ? "border-emerald-300 bg-gradient-to-b from-emerald-50/70 to-white"
          : "border-slate-200 bg-white"
      }`}
    >
      {(title || right) && (
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-semibold text-sm text-slate-800">{title}</h3>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-emerald-700">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      {label ?? "生成中…"}
    </span>
  );
}

export function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 8 ? "bg-emerald-500" : score >= 6 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 shrink-0 text-slate-500 truncate">{label}</span>
      <div className="h-1.5 flex-1 rounded bg-slate-200">
        <div className={`h-1.5 rounded ${color}`} style={{ width: `${score * 10}%` }} />
      </div>
      <span className="w-6 text-right tabular-nums text-slate-700">{score}</span>
    </div>
  );
}

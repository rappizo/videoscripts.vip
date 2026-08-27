"use client";

export interface StepDef {
  key: string;
  label: string;
  anchor: string;
  done: boolean;
  current: boolean;
}

export default function Stepper({ steps }: { steps: StepDef[] }) {
  return (
    <div className="sticky top-14 z-10 -mx-4 border-b border-slate-200 bg-slate-50/95 backdrop-blur px-4 py-2">
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {steps.map((s, i) => (
          <button
            key={s.key}
            onClick={() =>
              document.getElementById(s.anchor)?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              s.current
                ? "bg-emerald-600 text-white"
                : s.done
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {s.done && !s.current && <span>✓</span>}
            <span>
              {i + 1}. {s.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cancelJob, waitForJob, type JobStatus } from "@/lib/jobClient";
import { Btn, Spinner, Tag, useToast } from "./ui";
import Stepper from "./Stepper";
import MaterialsPanel from "./MaterialsPanel";
import AnglesPanel from "./AnglesPanel";
import HooksPanel from "./HooksPanel";
import OutlinePanel from "./OutlinePanel";
import ScriptsPanel, { type ScriptView } from "./ScriptsPanel";
import ProjectEditModal, { type ProjectEditValues } from "./ProjectEditModal";
import type {
  OutlineSection,
  ProjectDetail,
  SerializedAngle,
  SerializedScript,
  SerializedSegment,
} from "./types";

function jobProgressText(job: JobStatus): string {
  const p = job.progress as {
    step?: string;
    done?: number;
    total?: number;
    attempt?: number;
    round?: number;
  };
  const stepLabels: Record<string, string> = {
    angles: "生成角度",
    hooks: "生成钩子",
    outline: "生成大纲",
    scripts: "生成脚本",
    done: "收尾",
  };
  if (p.step && p.step !== "done") {
    let s = stepLabels[p.step] ?? p.step;
    if (typeof p.done === "number" && typeof p.total === "number") s += ` ${p.done}/${p.total}`;
    if (typeof p.attempt === "number") s += `(第 ${p.attempt}/2 次)`;
    if (typeof p.round === "number") s += ` · 评审第 ${p.round} 轮`;
    return `(${s})`;
  }
  if (typeof p.done === "number" && typeof p.total === "number") {
    if (typeof p.round === "number") return `(${p.done + 1}/${p.total} · 评审第 ${p.round} 轮)`;
    return `(${p.done}/${p.total})`;
  }
  if (typeof p.attempt === "number") return `(第 ${p.attempt}/2 次)`;
  return "";
}

interface BusyState {
  key: string;
  label: string;
}

// 草稿从 localStorage 惰性恢复(避免 effect 内 setState)
function loadLocalDrafts(key: string): {
  scripts: Record<string, SerializedSegment[]>;
  outline: { id: string; sections: OutlineSection[] } | null;
} {
  if (typeof window === "undefined") return { scripts: {}, outline: null };
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const o = JSON.parse(raw) as {
        scripts?: Record<string, SerializedSegment[]>;
        outline?: { id: string; sections: OutlineSection[] } | null;
      };
      return { scripts: o.scripts ?? {}, outline: o.outline ?? null };
    }
  } catch {
    // ignore
  }
  return { scripts: {}, outline: null };
}

export default function Workbench({ initial }: { initial: ProjectDetail }) {
  const toast = useToast();
  const [data, setData] = useState<ProjectDetail>(initial);
  const [busy, setBusy] = useState<BusyState | null>(null);
  const [activeJob, setActiveJob] = useState<string | null>(null);
  const [showAllHooks, setShowAllHooks] = useState(false);
  const [coverage, setCoverage] = useState<{ coverageOk: boolean; missing: string[] } | null>(null);
  const draftKey = `vs-drafts:${initial.id}`;
  const [localDrafts] = useState(() => loadLocalDrafts(draftKey));
  const [outlineEdit, setOutlineEdit] = useState<{ id: string; sections: OutlineSection[] } | null>(
    localDrafts.outline
  );
  const [scriptDrafts, setScriptDrafts] = useState<Record<string, SerializedSegment[]>>(localDrafts.scripts);
  const [scriptView, setScriptView] = useState<ScriptView>("edit");
  const [editingProject, setEditingProject] = useState(false);

  const selectedAngle = useMemo(
    () => data.angles.find((a) => a.status === "selected") ?? null,
    [data.angles]
  );
  const selectedHook = useMemo(
    () => selectedAngle?.hooks.find((h) => h.selected) ?? null,
    [selectedAngle]
  );
  const outline = selectedAngle?.outline ?? null;
  const scripts = useMemo(() => outline?.scripts ?? [], [outline]);
  // 大纲草稿:编辑绑定的 outline id 与当前一致才生效,否则用最新大纲
  const draftSections = useMemo(
    () => (outlineEdit && outlineEdit.id === outline?.id ? outlineEdit.sections : outline?.sections ?? []),
    [outlineEdit, outline]
  );

  const materialById = useMemo(() => {
    const m = new Map<string, string>();
    for (const mat of data.materials) m.set(mat.id, mat.content);
    return m;
  }, [data.materials]);

  // 已被大纲引用的素材 id(删除时警告)
  const referencedIds = useMemo(() => {
    const s = new Set<string>();
    for (const a of data.angles) {
      for (const sec of a.outline?.sections ?? []) {
        for (const ref of sec.materialRefs) s.add(ref);
      }
    }
    return s;
  }, [data.angles]);

  // ---------- 草稿自动保存(防刷新丢失) ----------
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ scripts: scriptDrafts, outline: outlineEdit }));
      } catch {
        // ignore
      }
    }, 800);
    return () => clearTimeout(t);
  }, [scriptDrafts, outlineEdit, draftKey]);

  async function refresh() {
    const res = await fetch(`/api/projects/${data.id}`);
    if (res.ok) setData(await res.json());
  }

  async function run(opts: {
    key: string;
    label: string;
    url: string;
    init?: RequestInit;
    onJobDone?: (job: JobStatus) => void;
    onOk?: (j: unknown) => void;
    onSuccess?: () => void;
  }) {
    setBusy({ key: opts.key, label: opts.label });
    try {
      const res = await fetch(opts.url, opts.init);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
      const jobId = (json as { jobId?: string }).jobId;
      if (jobId) {
        setActiveJob(jobId);
        try {
          const final = await waitForJob(jobId, (j) =>
            setBusy({ key: opts.key, label: `${opts.label} ${jobProgressText(j)}` })
          );
          if (final.status === "failed") throw new Error(final.error || "任务失败");
          if (final.status === "cancelled") {
            toast.push("info", "任务已取消");
            return;
          }
          if (final.tokensIn || final.tokensOut) {
            toast.push(
              "info",
              `本次消耗 ${(final.tokensIn + final.tokensOut).toLocaleString()} tokens · $${final.costUsd.toFixed(2)}`
            );
          }
          opts.onJobDone?.(final);
        } finally {
          setActiveJob(null);
        }
      }
      opts.onOk?.(json);
      opts.onSuccess?.();
      await refresh();
    } catch (e) {
      toast.push("error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function cancelActiveJob() {
    if (!activeJob) return;
    await cancelJob(activeJob);
  }

  const busyFor = (...prefixes: string[]) =>
    busy !== null && prefixes.some((p) => busy.key.startsWith(p));

  // 一键流水线运行期间锁住全部阶段,避免并发操作
  const globalLock = busyFor("autopilot");

  // ---------- 素材 ----------
  const addMaterial = (type: string, content: string, isRequired: boolean) =>
    run({
      key: "materials",
      label: "添加素材…",
      url: `/api/projects/${data.id}/materials`,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content, isRequired }),
      },
      onSuccess: () => toast.push("success", "素材已添加"),
    });

  const updateMaterial = (id: string, patch: { type?: string; content?: string; isRequired?: boolean }) =>
    run({
      key: "materials",
      label: "更新素材…",
      url: `/api/materials/${id}`,
      init: {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      },
      onSuccess: () => toast.push("success", "素材已更新"),
    });

  const deleteMaterial = (id: string) =>
    run({
      key: "materials",
      label: "删除素材…",
      url: `/api/materials/${id}`,
      init: { method: "DELETE" },
      onSuccess: () => toast.push("success", "素材已删除"),
    });

  // ---------- 角度 ----------
  const genAngles = () =>
    run({
      key: "angles",
      label: `正在生成 ${process.env.NEXT_PUBLIC_ANGLE_COUNT || 2} 个角度…`,
      url: `/api/projects/${data.id}/angles`,
      init: { method: "POST" },
      onSuccess: () => toast.push("success", "新角度已生成"),
    });

  const pickAngle = (angle: SerializedAngle) => {
    if (angle.status === "selected") return;
    run({
      key: "angles",
      label: "保存角度选择…",
      url: `/api/angles/${angle.id}`,
      init: {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "selected" }),
      },
      onSuccess: () => toast.push("success", "角度已选定"),
    });
  };

  const regenerateAngle = (angle: SerializedAngle) =>
    run({
      key: `regen-angle:${angle.id}`,
      label: "正在换一个角度…",
      url: `/api/angles/${angle.id}/regenerate`,
      init: { method: "POST" },
      onSuccess: () => toast.push("success", "已换一条新角度"),
    });

  // ---------- 钩子 ----------
  const genHooks = () =>
    selectedAngle &&
    run({
      key: "hooks",
      label: "正在生成 12 个钩子并评分…",
      url: `/api/angles/${selectedAngle.id}/hooks`,
      init: { method: "POST" },
      onSuccess: () => toast.push("success", "钩子已生成"),
    });

  const pickHook = (id: string) =>
    run({
      key: "hooks",
      label: "保存钩子选择…",
      url: `/api/hooks/${id}`,
      init: {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected: true }),
      },
      onSuccess: () => toast.push("success", "钩子已选定"),
    });

  const editHookText = (id: string, text: string) =>
    run({
      key: "hooks",
      label: "保存钩子文本…",
      url: `/api/hooks/${id}`,
      init: {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      },
      onSuccess: () => toast.push("success", "钩子已更新"),
    });

  const regenerateHook = (id: string) =>
    run({
      key: `regen-hook:${id}`,
      label: "正在换一条钩子…",
      url: `/api/hooks/${id}/regenerate`,
      init: { method: "POST" },
      onSuccess: () => toast.push("success", "已换一条新钩子"),
    });

  // ---------- 大纲 ----------
  const genOutline = () => {
    if (!selectedAngle || !selectedHook) return;
    setOutlineEdit(null);
    run({
      key: "outline",
      label: "正在生成大纲(素材引用锁死)…",
      url: `/api/angles/${selectedAngle.id}/outline`,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hookText: selectedHook.text }),
      },
      onJobDone: (job) => {
        const p = job.progress as { coverageOk?: boolean; missing?: string[] };
        setCoverage(p.coverageOk === false ? { coverageOk: false, missing: p.missing ?? [] } : null);
      },
      onSuccess: () => toast.push("success", "大纲已生成"),
    });
  };

  const lockAndGenScripts = async () => {
    if (!outline) return;
    setBusy({ key: "scripts", label: "锁定大纲…" });
    try {
      const res = await fetch(`/api/outlines/${outline.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: draftSections, status: "locked" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Failed to save outline");
      setBusy({ key: "scripts", label: "正在生成 3 个脚本候选并评审…" });
      const res2 = await fetch(`/api/outlines/${outline.id}/scripts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hookText: selectedHook?.text ?? "" }),
      });
      const json2 = await res2.json().catch(() => ({}));
      if (!res2.ok) throw new Error((json2 as { error?: string }).error ?? "Failed to generate scripts");
      const jobId = (json2 as { jobId?: string }).jobId;
      if (jobId) {
        setActiveJob(jobId);
        try {
          const final = await waitForJob(jobId, (j) =>
            setBusy({ key: "scripts", label: `正在生成脚本候选并评审 ${jobProgressText(j)}` })
          );
          if (final.status === "failed") throw new Error(final.error || "Failed to generate scripts");
        } finally {
          setActiveJob(null);
        }
      }
      setOutlineEdit(null);
      setCoverage(null);
      await refresh();
      toast.push("success", "3 个脚本候选已生成");
    } catch (e) {
      toast.push("error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  // ---------- 脚本 ----------
  const saveScript = (s: SerializedScript) =>
    run({
      key: `save:${s.id}`,
      label: "保存修改…",
      url: `/api/scripts/${s.id}`,
      init: {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segments: scriptDrafts[s.id] ?? s.segments }),
      },
      onSuccess: () => {
        setScriptDrafts((prev) => {
          const next = { ...prev };
          delete next[s.id];
          return next;
        });
        toast.push("success", "已保存(修改已记录,供微调使用)");
      },
    });

  const reviewScript = (s: SerializedScript, maxRounds: number) =>
    run({
      key: `review:${s.id}`,
      label: maxRounds === 0 ? "评审中(不改写)…" : "评审+自动迭代改写中(可能 1-3 分钟)…",
      url: `/api/scripts/${s.id}/review`,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxRounds }),
      },
      onSuccess: () => toast.push("success", maxRounds === 0 ? "评审完成" : "自动迭代改写完成"),
    });

  const collectScript = (s: SerializedScript) =>
    run({
      key: `collect:${s.id}`,
      label: "收藏到案例库…",
      url: "/api/cases",
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptId: s.id }),
      },
      onSuccess: () => toast.push("success", "已收藏到案例库,成为你的专属语料"),
    });

  const deleteScript = (s: SerializedScript) =>
    run({
      key: `save:${s.id}`,
      label: "删除脚本…",
      url: `/api/scripts/${s.id}`,
      init: { method: "DELETE" },
      onSuccess: () => toast.push("success", "脚本已删除"),
    });

  const copyScript = (s: SerializedScript) => {
    const segs = scriptDrafts[s.id] ?? s.segments;
    const text = [
      `[HOOK] ${s.hookText}`,
      "",
      ...segs.map(
        (seg) =>
          `(${seg.time})\nVO: ${seg.voiceover}\nVisual: ${seg.visual}\nText: ${seg.onscreenText || "-"}`
      ),
    ].join("\n\n");
    navigator.clipboard
      .writeText(text)
      .then(() => toast.push("success", "已复制纯文本"))
      .catch(() => toast.push("error", "复制失败"));
  };

  const exportScript = async (s: SerializedScript, format: "txt" | "srt" | "md") => {
    try {
      const res = await fetch(`/api/scripts/${s.id}/export?format=${format}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `script-${s.id.slice(-6)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.push("success", `已下载 .${format} 文件`);
    } catch (e) {
      toast.push("error", e instanceof Error ? e.message : String(e));
    }
  };

  // ---------- 一键流水线 ----------
  const autoPilot = () =>
    run({
      key: "autopilot",
      label: "一键生成整条脚本…",
      url: `/api/projects/${data.id}/autopilot`,
      init: { method: "POST" },
      onSuccess: () => {
        setScriptView("compare");
        toast.push("success", "一键流水线完成,3 个候选已就绪(已自动选中角度/钩子)");
      },
    });

  // ---------- 项目编辑 ----------
  const saveProject = (values: ProjectEditValues) =>
    run({
      key: "project",
      label: "保存项目信息…",
      url: `/api/projects/${data.id}`,
      init: {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      },
      onSuccess: () => {
        setEditingProject(false);
        toast.push("success", "项目信息已更新");
      },
    });

  const editSegment = (script: SerializedScript, index: number, field: keyof SerializedSegment, value: string) => {
    setScriptDrafts((prev) => {
      const base = prev[script.id] ?? script.segments;
      const list = base.map((seg, i) => (i === index ? { ...seg, [field]: value } : seg));
      return { ...prev, [script.id]: list };
    });
  };

  const editOutlineSection = (index: number, field: keyof OutlineSection, value: string) => {
    if (!outline) return;
    setOutlineEdit((prev) => {
      const base = prev && prev.id === outline.id ? prev.sections : outline.sections;
      const next = base.map((sec, i) => {
        if (i !== index) return sec;
        if (field === "materialRefs")
          return { ...sec, materialRefs: value.split(",").map((x) => x.trim()).filter(Boolean) };
        return { ...sec, [field]: value };
      });
      return { id: outline.id, sections: next };
    });
  };

  // ---------- 步骤条 ----------
  const baseSteps = [
    { key: "angles", label: "角度", anchor: "step-angles", done: !!selectedAngle },
    { key: "hooks", label: "钩子", anchor: "step-hooks", done: !!selectedHook },
    { key: "outline", label: "大纲", anchor: "step-outline", done: outline?.status === "locked" },
    { key: "scripts", label: "脚本", anchor: "step-scripts", done: scripts.length > 0 },
    { key: "export", label: "导出", anchor: "step-scripts", done: scripts.length > 0 },
  ];
  const pendingIdx = baseSteps.findIndex((s) => !s.done);
  const currentIdx = pendingIdx === -1 ? baseSteps.length - 1 : pendingIdx;
  const steps = baseSteps.map((s, i) => ({ ...s, current: i === currentIdx }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      <Stepper steps={steps} />

      {/* 头部 */}
      <div className="scroll-mt-28">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← 返回项目列表
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{data.topic}</h1>
          <Tag>{data.niche || "未分类"}</Tag>
          <Tag>{data.durationSec}s</Tag>
          {data.audience && <Tag>{data.audience}</Tag>}
          {data.stats?.jobCount > 0 && (
            <span className="text-xs text-slate-400">
              累计 {data.stats.jobCount} 次生成 · {(data.stats.tokensIn + data.stats.tokensOut).toLocaleString()} tokens · $
              {data.stats.costUsd.toFixed(2)}
            </span>
          )}
          <span className="ml-auto flex items-center gap-2">
            <Btn
              onClick={autoPilot}
              disabled={!!busy}
              title="自动跑完角度→钩子→大纲→脚本,已完成的步骤会跳过"
            >
              一键生成整条脚本 ⚡
            </Btn>
            <Btn variant="ghost" onClick={() => setEditingProject(true)} disabled={busyFor("project")}>
              编辑项目
            </Btn>
          </span>
        </div>
        {busy && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3">
            <Spinner label={busy.label} />
            {activeJob && (
              <button
                onClick={() => void cancelActiveJob()}
                className="ml-auto rounded border border-red-200 px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                {globalLock ? "暂停(已完成步骤保留)" : "取消任务"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 素材 */}
      <div id="step-materials" className="scroll-mt-28">
        <MaterialsPanel
          materials={data.materials}
          referencedIds={referencedIds}
          disabled={globalLock || busyFor("materials")}
          onAdd={addMaterial}
          onUpdate={updateMaterial}
          onDelete={deleteMaterial}
        />
      </div>

      {/* ① 角度 */}
      <div id="step-angles" className="scroll-mt-28">
        <AnglesPanel
          angles={data.angles}
          disabled={globalLock || busyFor("angles")}
          spinningId={busy?.key.startsWith("regen-angle:") ? busy.key.slice("regen-angle:".length) : null}
          onGenerate={genAngles}
          onPick={pickAngle}
          onRegenerate={regenerateAngle}
        />
      </div>

      {/* ② 钩子 */}
      <div id="step-hooks" className="scroll-mt-28">
        {selectedAngle ? (
          <HooksPanel
            hooks={selectedAngle.hooks}
            showAll={showAllHooks}
            onToggleShowAll={() => setShowAllHooks((v) => !v)}
            disabled={globalLock || busyFor("hooks")}
            spinningId={busy?.key.startsWith("regen-hook:") ? busy.key.slice("regen-hook:".length) : null}
            onGenerate={genHooks}
            onPick={pickHook}
            onEditText={editHookText}
            onRegenerate={regenerateHook}
          />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            先在 ① 选择一个角度。
          </div>
        )}
      </div>

      {/* ③ 大纲 */}
      <div id="step-outline" className="scroll-mt-28">
        <OutlinePanel
          outline={outline}
          draftSections={draftSections}
          selectedHookText={selectedHook?.text ?? null}
          disabled={globalLock || busyFor("outline", "scripts")}
          coverage={coverage}
          materialById={materialById}
          onEditSection={editOutlineSection}
          onGenerate={genOutline}
          onLockAndGen={lockAndGenScripts}
        />
      </div>

      {/* ④ 脚本 */}
      <div id="step-scripts" className="scroll-mt-28">
        <ScriptsPanel
          scripts={scripts}
          view={scriptView}
          setView={setScriptView}
          drafts={scriptDrafts}
          disabled={globalLock || busyFor("scripts", "review:", "save:")}
          spinningId={busy?.key.startsWith("review:") ? busy.key.slice("review:".length) : null}
          onEditSegment={editSegment}
          onSave={saveScript}
          onReview={reviewScript}
          onCollect={collectScript}
          onDelete={deleteScript}
          onCopy={copyScript}
          onExport={exportScript}
        />
      </div>

      <ProjectEditModal
        key={String(editingProject)}
        open={editingProject}
        initial={data}
        busy={busyFor("project")}
        onClose={() => setEditingProject(false)}
        onSave={saveProject}
      />
    </div>
  );
}

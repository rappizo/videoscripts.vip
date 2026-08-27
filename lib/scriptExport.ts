// 脚本导出格式:纯文本 / SRT 字幕 / Markdown 分镜表
import type { ScriptSegment } from "./pipeline/types";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// 解析 time 字段(如 "0-3s"、"0:00-0:03"),返回 [startSec, endSec];解析失败返回 null
export function parseTimeRange(time: string): [number, number] | null {
  const mmss = time.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
  if (mmss) {
    const start = Number(mmss[1]) * 60 + Number(mmss[2]);
    const end = Number(mmss[3]) * 60 + Number(mmss[4]);
    return end > start ? [start, end] : null;
  }
  const sec = time.match(/^(\d+)\s*-\s*(\d+)\s*s?$/);
  if (sec) {
    const start = Number(sec[1]);
    const end = Number(sec[2]);
    return end > start ? [start, end] : null;
  }
  const single = time.match(/^(\d+)\s*s?$/);
  if (single) {
    const start = Number(single[1]);
    return [start, start + 3];
  }
  return null;
}

export function secondsToSrtTime(sec: number): string {
  const totalMs = Math.max(0, Math.round(sec * 1000));
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${String(ms).padStart(3, "0")}`;
}

export function scriptToText(hookText: string, segments: ScriptSegment[]): string {
  return [
    `[HOOK] ${hookText}`,
    "",
    ...segments.map(
      (seg) => `(${seg.time})\nVO: ${seg.voiceover}\nVisual: ${seg.visual}\nText: ${seg.onscreenText || "-"}`
    ),
  ].join("\n\n");
}

export function scriptToSrt(hookText: string, segments: ScriptSegment[]): string {
  const entries: { text: string; onscreen?: string; time?: string }[] = [
    { text: hookText },
    ...segments.map((s) => ({ text: s.voiceover, onscreen: s.onscreenText, time: s.time })),
  ];
  let cursor = 0;
  const blocks: string[] = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    let start: number;
    let end: number;
    const range = i === 0 ? null : parseTimeRange(e.time ?? "");
    if (range) {
      [start, end] = range;
      cursor = end;
    } else {
      start = cursor;
      end = cursor + 3;
      cursor = end;
    }
    const body = [e.text];
    if (e.onscreen) body.push(`[字幕] ${e.onscreen}`);
    blocks.push(`${i + 1}\n${secondsToSrtTime(start)} --> ${secondsToSrtTime(end)}\n${body.join("\n")}`);
  }
  return blocks.join("\n\n");
}

export function scriptToMarkdown(hookText: string, segments: ScriptSegment[]): string {
  const rows = segments
    .map(
      (seg) => `| ${seg.time} | ${seg.voiceover.replace(/\|/g, "\\|")} | ${seg.visual.replace(/\|/g, "\\|")} | ${(seg.onscreenText || "-").replace(/\|/g, "\\|")} |`
    )
    .join("\n");
  return [`# ${hookText}`, "", "| 时间 | 台词 VO | 画面 | 屏上文字 |", "| --- | --- | --- | --- |", rows].join("\n");
}

export function buildScriptExport(
  format: string,
  hookText: string,
  segments: ScriptSegment[]
): { content: string; ext: string } {
  if (format === "srt") return { content: scriptToSrt(hookText, segments), ext: "srt" };
  if (format === "md") return { content: scriptToMarkdown(hookText, segments), ext: "md" };
  return { content: scriptToText(hookText, segments), ext: "txt" };
}

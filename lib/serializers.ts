// 数据库记录 → API 响应序列化(解析 JSON 字段)
/* eslint-disable @typescript-eslint/no-explicit-any */

export function serializeAngle(a: any) {
  if (!a) return a;
  return { ...a, cards: safeParse(a.cards, {}) };
}

export function serializeHook(h: any) {
  if (!h) return h;
  return { ...h, scores: safeParse(h.scores, {}) };
}

export function serializeOutline(o: any) {
  if (!o) return o;
  return { ...o, sections: safeParse(o.sections, []) };
}

export function serializeScript(s: any) {
  if (!s) return s;
  return {
    ...s,
    segments: safeParse(s.segments, []),
    scores: safeParse(s.scores, {}),
    cards: safeParse(s.cards, {}),
  };
}

export function serializeReview(r: any) {
  if (!r) return r;
  return { ...r, dimensions: safeParse(r.dimensions, {}), findings: safeParse(r.findings, []) };
}

export function serializeCase(c: any) {
  if (!c) return c;
  return { ...c, tags: safeParse(c.tags, {}) };
}

export function serializeMaterial(m: any) {
  if (!m) return m;
  const copy = { ...m };
  delete copy.project;
  return copy;
}

export function serializeJob(j: any) {
  if (!j) return j;
  return { ...j, progress: safeParse(j.progress, {}), result: safeParse(j.result, null) };
}

export function safeParse(raw: string, fallback: unknown) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// 流水线共享类型

export interface CreativeCards {
  structureId: string;
  structureName: string;
  personaId: string;
  personaName: string;
  opening: string;
  emotionArc: string;
  mashup: string | null;
}

export interface MaterialInput {
  id: string;
  type: string;
  content: string;
  isRequired: boolean;
}

export interface ProjectContext {
  id: string;
  topic: string;
  description: string;
  niche: string;
  audience: string;
  durationSec: number;
  style: string;
  goal: string;
  materials: MaterialInput[];
}

export interface AngleInfo {
  title: string;
  premise: string;
}

export interface OutlineSection {
  timeRange: string;
  beat: string;
  summary: string;
  direction: string;
  materialRefs: string[];
}

export interface ScriptSegment {
  time: string;
  voiceover: string;
  visual: string;
  onscreenText: string;
}

export interface HookScores {
  specificity?: number;
  curiosityGap?: number;
  promiseClarity?: number;
  first3seconds?: number;
  contentFit?: number;
}

export interface HookCandidate {
  text: string;
  hookType: string;
  label: string;
  template: string;
  scores: HookScores;
  total: number;
  reason: string;
}

export interface ReviewResult {
  dimensions: Record<string, { score: number; reason: string }>;
  avgScore: number;
  findings: string[];
  passed: boolean;
}

export interface AngleCandidate {
  title: string;
  premise: string;
  whyItWorks: string;
  cards: CreativeCards;
}

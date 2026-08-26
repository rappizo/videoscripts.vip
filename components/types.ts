// 前后端共享的序列化类型
export interface SerializedMaterial {
  id: string;
  type: string;
  content: string;
  isRequired: boolean;
}

export interface SerializedHook {
  id: string;
  text: string;
  hookType: string;
  total: number | null;
  scores: Record<string, number>;
  selected: boolean;
}

export interface OutlineSection {
  timeRange: string;
  beat: string;
  summary: string;
  direction: string;
  materialRefs: string[];
}

export interface SerializedOutline {
  id: string;
  status: string;
  sections: OutlineSection[];
  scripts: SerializedScript[];
}

export interface SerializedSegment {
  time: string;
  voiceover: string;
  visual: string;
  onscreenText: string;
}

export interface SerializedReview {
  id: string;
  dimensions: Record<string, { score: number; reason: string }>;
  avgScore: number | null;
  passed: boolean;
  findings: string[];
  attempt: number;
}

export interface SerializedScript {
  id: string;
  hookText: string;
  segments: SerializedSegment[];
  status: string;
  cards: {
    structureName?: string;
    personaName?: string;
    opening?: string;
    emotionArc?: string;
    mashup?: string | null;
  };
  reviews: SerializedReview[];
  editLogs?: { id: string; field: string; before: string; after: string }[];
}

export interface SerializedAngle {
  id: string;
  title: string;
  premise: string;
  whyItWorks: string;
  status: string;
  cards: {
    structureName?: string;
    personaName?: string;
    opening?: string;
    emotionArc?: string;
    mashup?: string | null;
  };
  hooks: SerializedHook[];
  outline: SerializedOutline | null;
}

export interface ProjectDetail {
  id: string;
  topic: string;
  description: string;
  niche: string;
  audience: string;
  durationSec: number;
  style: string;
  goal: string;
  materials: SerializedMaterial[];
  angles: SerializedAngle[];
}

export interface ProjectSummary {
  id: string;
  topic: string;
  niche: string;
  audience: string;
  durationSec: number;
  createdAt: string;
  materialCount: number;
  angleCount: number;
  selectedAngle: string | null;
  hasOutline: boolean;
}

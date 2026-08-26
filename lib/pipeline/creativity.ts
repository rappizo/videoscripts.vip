// 创意牌组引擎:随机抽取 结构×人设×开场方式×情绪曲线×跨域混搭
import { loadJson } from "./assets";
import type { CreativeCards } from "./types";

interface StructureShape {
  structures: {
    id: string;
    name: string;
    beats: { pct: string; beat: string }[];
  }[];
}

interface PersonaShape {
  personas: { id: string; name: string; voice: string; example: string }[];
}

const OPENINGS = [
  "Start with a question the viewer has never been asked before",
  "Start with one specific sensory detail, no setup",
  "Start mid-action, in the middle of the moment",
  "Start with a number that surprises",
  "Start with a quiet confession",
  "Start with a direct command",
  "Start with a vivid two-sentence mini-scene",
  "Start by contradicting what the viewer expects",
];

const EMOTION_ARCS = [
  "curiosity → payoff → satisfaction",
  "tension → relief",
  "recognition → hope",
  "humor → insight",
  "awe → practical takeaway",
  "fear → safety",
  "frustration → clarity",
  "nostalgia → motivation",
];

const MASHUP_DOMAINS = [
  "true crime documentary",
  "sports commentary",
  "cooking show",
  "courtroom drama",
  "nature documentary",
  "stand-up comedy",
  "detective noir",
  "financial news broadcast",
  "reality TV confessional",
  "video game walkthrough",
];

export function drawCards(rng: () => number = Math.random): CreativeCards {
  const structures = loadJson<StructureShape>("structures.json").structures;
  const personas = loadJson<PersonaShape>("personas.json").personas;
  const structure = structures[Math.floor(rng() * structures.length)];
  const persona = personas[Math.floor(rng() * personas.length)];
  const opening = OPENINGS[Math.floor(rng() * OPENINGS.length)];
  const emotionArc = EMOTION_ARCS[Math.floor(rng() * EMOTION_ARCS.length)];
  // 40% 概率启用跨域混搭,强制走出常规路径
  const mashup = rng() < 0.4 ? MASHUP_DOMAINS[Math.floor(rng() * MASHUP_DOMAINS.length)] : null;
  return {
    structureId: structure.id,
    structureName: structure.name,
    personaId: persona.id,
    personaName: persona.name,
    opening,
    emotionArc,
    mashup,
  };
}

export function cardsToPrompt(cards: CreativeCards): string {
  const structures = loadJson<StructureShape>("structures.json").structures;
  const personas = loadJson<PersonaShape>("personas.json").personas;
  const structure = structures.find((s) => s.id === cards.structureId);
  const persona = personas.find((p) => p.id === cards.personaId);
  const beats = (structure?.beats ?? [])
    .map((b) => `    - ${b.pct}: ${b.beat}`)
    .join("\n");
  const lines = [
    `- Narrative structure: ${cards.structureName}`,
    beats ? `  Beat map:\n${beats}` : "",
    `- Writer persona: ${cards.personaName}`,
    persona ? `  Voice: ${persona.voice}` : "",
    persona ? `  Sample line in this voice: "${persona.example}"` : "",
    `- Opening device: ${cards.opening}`,
    `- Emotion arc: ${cards.emotionArc}`,
    cards.mashup
      ? `- Cross-domain flavor: pace and build tension like a ${cards.mashup}`
      : "- Cross-domain flavor: none",
  ];
  return lines.filter(Boolean).join("\n");
}

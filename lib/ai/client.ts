import OpenAI from "openai";

const baseURL = process.env.AI_BASE_URL || "https://api.apiyi.com/v1";
const apiKey = process.env.AI_API_KEY || "";
const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 120000);
const DEFAULT_MODEL = "claude-opus-4.6";

const client = new OpenAI({
  apiKey: apiKey || "missing-key",
  baseURL,
  timeout: timeoutMs,
});

export function getModel(kind: "creative" | "critic"): string {
  if (kind === "creative") {
    return process.env.MODEL_CREATIVE || DEFAULT_MODEL;
  }
  return process.env.MODEL_CRITIC || process.env.MODEL_CREATIVE || DEFAULT_MODEL;
}

export interface CompleteOptions {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function complete(opts: CompleteOptions): Promise<string> {
  const model = opts.model ?? getModel("creative");
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await client.chat.completions.create({
        model,
        temperature: opts.temperature ?? 0.8,
        max_tokens: opts.maxTokens ?? 2000,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
      });
      const text = res.choices[0]?.message?.content ?? "";
      if (!text.trim()) throw new Error("Empty response from model");
      return text;
    } catch (e) {
      lastErr = e;
      const wait = Math.min(2000 * 2 ** attempt, 8000);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error(
    `AI request failed after 3 retries: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`
  );
}

export function extractJson<T>(text: string): T {
  const trimmed = text.trim();
  let candidate = trimmed;
  const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidate = fence[1].trim();
  try {
    return JSON.parse(candidate) as T;
  } catch {
    // fall through
  }
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(candidate.slice(start, end + 1)) as T;
    } catch {
      // fall through
    }
  }
  throw new Error("Failed to parse model output as JSON: " + candidate.slice(0, 300));
}

export async function completeJson<T>(opts: CompleteOptions): Promise<T> {
  const text = await complete(opts);
  return extractJson<T>(text);
}

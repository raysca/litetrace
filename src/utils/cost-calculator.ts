import type { ModelCostEntry } from "../config";

export const UNKNOWN_COST = null;

// Strip Ollama-style `:tag` suffix: "llama3:8b" → "llama3", "gpt-oss:20b" → "gpt-oss"
function baseModelName(name: string): string {
  const colon = name.indexOf(":");
  return colon === -1 ? name : name.slice(0, colon);
}

export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
  configCosts: Record<string, ModelCostEntry> = {},
): number | null {
  if (promptTokens < 0 || completionTokens < 0) return UNKNOWN_COST;

  const m  = model.toLowerCase();
  const mb = baseModelName(m);

  // Sort longest-first so more specific keys win ("gpt-4o-mini" before "gpt-4o")
  const keys = Object.keys(configCosts).sort((a, b) => b.length - a.length);

  // Pass 1 — exact substring match
  let hit = keys.find(k => m.includes(k.toLowerCase()));

  // Pass 2 — base-name match (strips :tag from both sides)
  if (!hit) {
    hit = keys.find(k => {
      const kb = baseModelName(k.toLowerCase());
      return mb.includes(kb) || kb.includes(mb);
    });
  }

  if (!hit) return UNKNOWN_COST;

  const [inputRate, outputRate] = configCosts[hit]!;
  return (promptTokens / 1_000_000) * inputRate
       + (completionTokens / 1_000_000) * outputRate;
}

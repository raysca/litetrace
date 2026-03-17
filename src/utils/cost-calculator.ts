import type { ModelCostEntry } from "../config";

export const UNKNOWN_COST = null;

// Built-in pricing table ($/1M tokens): [input, output]
const BUILTIN_COSTS: Record<string, ModelCostEntry> = {
  // OpenAI
  "gpt-4o-mini":       [0.15,   0.60],
  "gpt-4o":            [2.50,  10.00],
  "gpt-4-turbo":       [10.00, 30.00],
  "gpt-4":             [30.00, 60.00],
  "gpt-3.5-turbo":     [0.50,   1.50],
  "o1-mini":           [3.00,  12.00],
  "o1":                [15.00, 60.00],
  // Anthropic
  "claude-3-haiku":    [0.25,   1.25],
  "claude-3-sonnet":   [3.00,  15.00],
  "claude-3-opus":     [15.00, 75.00],
  "claude-3-5-haiku":  [0.80,   4.00],
  "claude-3-5-sonnet": [3.00,  15.00],
  "claude-3-7-sonnet": [3.00,  15.00],
};

// Strip Ollama-style `:tag` suffix: "llama3:8b" → "llama3", "gpt-oss:20b" → "gpt-oss"
function baseModelName(name: string): string {
  const colon = name.indexOf(":");
  return colon === -1 ? name : name.slice(0, colon);
}

function findInTable(
  m: string,
  mb: string,
  table: Record<string, ModelCostEntry>,
): ModelCostEntry | undefined {
  // Sort longest-first so more specific keys win ("gpt-4o-mini" before "gpt-4o")
  const keys = Object.keys(table).sort((a, b) => b.length - a.length);
  // Pass 1 — exact substring match
  let hit = keys.find(k => m.includes(k.toLowerCase()));
  // Pass 2 — base-name match (strips :tag from both sides)
  if (!hit) {
    hit = keys.find(k => {
      const kb = baseModelName(k.toLowerCase());
      return mb.includes(kb) || kb.includes(mb);
    });
  }
  return hit ? table[hit] : undefined;
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

  // Config-provided costs take precedence over built-ins
  const entry = findInTable(m, mb, configCosts) ?? findInTable(m, mb, BUILTIN_COSTS);
  if (!entry) return UNKNOWN_COST;

  const [inputRate, outputRate] = entry;
  return (promptTokens / 1_000_000) * inputRate
       + (completionTokens / 1_000_000) * outputRate;
}

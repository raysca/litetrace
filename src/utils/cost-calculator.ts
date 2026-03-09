// Prices in USD per 1M tokens: [inputPer1M, outputPer1M]
const MODEL_PRICES: Record<string, [number, number]> = {
  "gpt-4o":               [2.50,  10.00],
  "gpt-4o-mini":          [0.15,   0.60],
  "gpt-4":                [30.00, 60.00],
  "gpt-3.5-turbo":        [0.50,   1.50],
  "claude-3-5-sonnet":    [3.00,  15.00],
  "claude-sonnet-4":      [3.00,  15.00],
  "claude-3-5-haiku":     [0.80,   4.00],
  "claude-haiku-4":       [0.80,   4.00],
  "claude-3-haiku":       [0.25,   1.25],
  "claude-3-opus":        [15.00, 75.00],
  "claude-opus-4":        [15.00, 75.00],
};

// Sort keys by length descending so more specific keys (e.g. "gpt-4o-mini")
// are matched before shorter prefixes (e.g. "gpt-4o" or "gpt-4").
const SORTED_KEYS = Object.keys(MODEL_PRICES).sort((a, b) => b.length - a.length);

export const UNKNOWN_COST = null;

export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number | null {
  if (promptTokens < 0 || completionTokens < 0) return UNKNOWN_COST;

  const key = SORTED_KEYS.find(k => model.includes(k));
  if (!key) return UNKNOWN_COST;

  const [inputRate, outputRate] = MODEL_PRICES[key]!;
  const cost = (promptTokens / 1_000_000) * inputRate
             + (completionTokens / 1_000_000) * outputRate;
  return cost;
}

import type { NormalizedSpan, AttributeValue } from "./types";
import { calculateCost } from "../utils/cost-calculator";
import { config } from "../config";

const LLM_ATTRIBUTE_MARKERS = [
  "gen_ai.system",
  "gen_ai.request.model",
  "gen_ai.response.model",
  "ai.model.id",
];

export function isLlmSpan(span: NormalizedSpan): boolean {
  return LLM_ATTRIBUTE_MARKERS.some(k => {
    const v = span.attributes[k];
    return typeof v === "string" && v.length > 0;
  });
}

export interface LlmObservationData {
  spanId:            string;
  traceId:           string;
  model:             string | null;
  provider:          string | null;
  promptTokens:      number | null;
  completionTokens:  number | null;
  totalTokens:       number | null;
  costUsd:           number | null;
  prompt:            string | null;
  completion:        string | null;
  createdAt:         number; // unix µs
}

function str(v: AttributeValue | undefined): string | null {
  if (v == null || Array.isArray(v)) return null;
  return String(v);
}

function num(v: AttributeValue | undefined): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function normalizeProvider(raw: string | null): string | null {
  if (!raw) return null;
  // "openai.chat" → "openai", "anthropic.messages" → "anthropic"
  return raw.split(".")[0] ?? raw;
}

export function extractLlmObservation(span: NormalizedSpan): LlmObservationData {
  const a = span.attributes;

  const model = str(a["gen_ai.response.model"])
             ?? str(a["gen_ai.request.model"])
             ?? str(a["ai.model.id"]);

  const providerRaw = str(a["gen_ai.system"]) ?? str(a["ai.model.provider"]);
  const provider = normalizeProvider(providerRaw);

  const promptTokens =
    num(a["gen_ai.usage.input_tokens"])
    ?? num(a["gen_ai.usage.prompt_tokens"])
    ?? num(a["ai.usage.promptTokens"]);

  const completionTokens =
    num(a["gen_ai.usage.output_tokens"])
    ?? num(a["gen_ai.usage.completion_tokens"])
    ?? num(a["ai.usage.completionTokens"]);

  const totalTokens =
    (promptTokens != null && completionTokens != null)
      ? promptTokens + completionTokens
      : null;

  const costUsd =
    model && promptTokens != null && completionTokens != null
      ? calculateCost(model, promptTokens, completionTokens, config.costs)
      : null;

  // Prompt: prefer ai.prompt (AI SDK JSON), else build from span events
  let prompt = str(a["ai.prompt"]);
  if (!prompt) {
    const msgEvents = span.events
      .filter(e => ["gen_ai.system.message", "gen_ai.user.message", "gen_ai.tool.message"].includes(e.name))
      .map(e => ({ role: e.name.replace("gen_ai.", "").replace(".message", ""), content: e.attributes["content"] }));
    if (msgEvents.length > 0) prompt = JSON.stringify(msgEvents);
  }

  // Completion: prefer ai.response.text, else gen_ai.choice event
  let completion = str(a["ai.response.text"]);
  if (!completion) {
    const choiceEvent = span.events.find(e => e.name === "gen_ai.choice");
    if (choiceEvent?.attributes["message"]) {
      completion = str(choiceEvent.attributes["message"]);
    }
  }

  return {
    spanId:           span.spanId,
    traceId:          span.traceId,
    model,
    provider,
    promptTokens,
    completionTokens,
    totalTokens,
    costUsd,
    prompt,
    completion,
    createdAt: Number(span.startTimeUnixNano / 1000n),
  };
}

import { upsertSpans } from "../../storage/trace-repository";
import { getDb } from "../../db/client";
import { observations } from "../../db/schema";
import { internalError } from "../errors";
import type { NormalizedSpan } from "../../processor/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function randomHex(len: number): string {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

function msToNano(ms: number): bigint {
  return BigInt(Math.floor(ms)) * 1_000_000n;
}

function jitter(base: number, pct: number): number {
  const delta = base * pct;
  return base + (Math.random() * 2 - 1) * delta;
}

function weightedRandom<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

function daysAgoMs(n: number): number {
  return Date.now() - n * 24 * 60 * 60 * 1000;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

// ─── Time Distribution ───────────────────────────────────────────────────────

function generateTimestamps(count: number): number[] {
  const timestamps: number[] = [];

  for (let i = 0; i < count; i++) {
    // Pick a day (0 = today, 44 = 44 days ago)
    const day = Math.floor(Math.random() * 45);
    const dayMs = daysAgoMs(day);

    // Adjust for day of week (Mon-Fri = 3x, Sat-Sun = 1x)
    const date = new Date(dayMs);
    const dow = date.getUTCDay(); // 0=Sun, 6=Sat
    const isWeekend = dow === 0 || dow === 6;
    if (isWeekend && Math.random() < 0.75) {
      // re-roll to a weekday
      const rollDay = Math.floor(Math.random() * 45);
      const rollDate = new Date(daysAgoMs(rollDay));
      const rollDow = rollDate.getUTCDay();
      if (rollDow === 0 || rollDow === 6) {
        // still weekend, just use it
      }
    }

    // Pick hour (08:00-18:00 = 4x, else 1x)
    let hour: number;
    if (Math.random() < 0.8) {
      hour = 8 + Math.floor(Math.random() * 10); // 08-17
    } else {
      hour = Math.floor(Math.random() * 24);
    }

    const startOfDay = new Date(dayMs);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const intraDay = (hour * 60 + Math.floor(Math.random() * 60)) * 60 * 1000
      + Math.floor(Math.random() * 60 * 1000);

    timestamps.push(startOfDay.getTime() + intraDay);
  }

  return timestamps.sort((a, b) => a - b);
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ObservationRow {
  id: string;
  spanId: string;
  traceId: string;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  prompt: string;
  completion: string;
  createdAt: number;
}

interface ScenarioResult {
  spans: NormalizedSpan[];
  observations: ObservationRow[];
}

// ─── LLM Models ──────────────────────────────────────────────────────────────

const LLM_MODELS = [
  { id: "gpt-4o",              provider: "openai",    promptCost: 0.000005,  completionCost: 0.000015  },
  { id: "gpt-4o-mini",         provider: "openai",    promptCost: 0.00000015, completionCost: 0.0000006 },
  { id: "claude-3-5-sonnet",   provider: "anthropic", promptCost: 0.000003,  completionCost: 0.000015  },
  { id: "claude-3-5-haiku",    provider: "anthropic", promptCost: 0.0000008, completionCost: 0.000004  },
  { id: "gemini-2.0-flash",    provider: "google",    promptCost: 0.00000015, completionCost: 0.0000006 },
];

const MODEL_WEIGHTS = [25, 30, 20, 15, 10];

function pickModel() {
  return weightedRandom(LLM_MODELS, MODEL_WEIGHTS);
}

function tokenRangeForModel(modelId: string): { promptMin: number; promptMax: number; completionMin: number; completionMax: number } {
  if (modelId === "gpt-4o" || modelId === "claude-3-5-sonnet") {
    return { promptMin: 500, promptMax: 2000, completionMin: 100, completionMax: 800 };
  }
  return { promptMin: 300, promptMax: 1500, completionMin: 80, completionMax: 500 };
}

function calcCost(model: typeof LLM_MODELS[0], promptTokens: number, completionTokens: number): number {
  return model.promptCost * promptTokens + model.completionCost * completionTokens;
}

// ─── Sample Prompts / Completions ────────────────────────────────────────────

const PROMPTS = [
  "Summarize the following document and extract key action items.",
  "You are a helpful assistant. Answer the user's question concisely.",
  "Given the user's query, search for relevant information and provide a comprehensive answer.",
  "Analyze the following code for bugs and suggest improvements.",
  "Translate the following text to Spanish and maintain the original tone.",
];

const COMPLETIONS = [
  "Here is a summary of the document with the key action items highlighted.",
  "Based on your question, here is a concise and accurate answer.",
  "I found several relevant pieces of information that address your query.",
  "I analyzed the code and identified the following potential issues.",
  "Aquí está la traducción del texto manteniendo el tono original.",
];

// ─── Scenario 1: HTTP Microservices ──────────────────────────────────────────

const HTTP_SERVICES = ["api-gateway", "user-service", "order-service", "payment-service"];
const HTTP_ROUTES = [
  "GET /api/users",
  "POST /api/orders",
  "GET /api/products/:id",
  "PUT /api/users/:id",
  "DELETE /api/sessions",
  "POST /api/payments",
  "GET /api/inventory",
];

function makeHttpTrace(baseTimeMs: number): ScenarioResult {
  const traceId = randomHex(32);
  const rootSpanId = randomHex(16);
  const service = pick(HTTP_SERVICES);
  const route = pick(HTTP_ROUTES);

  // Latency profile
  const totalMs = weightedRandom(
    [jitter(80, 0.3), jitter(400, 0.3), jitter(2000, 0.3), jitter(8000, 0.3)],
    [50, 35, 10, 5]
  );

  const hasError = Math.random() < 0.15;
  const errorType = pick(["db_timeout", "downstream_500", "payment_declined"]);

  const startNano = msToNano(baseTimeMs);
  const endNano = msToNano(baseTimeMs + totalMs);

  const rootSpan: NormalizedSpan = {
    spanId: rootSpanId,
    traceId,
    parentSpanId: null,
    name: route,
    kind: 2,
    startTimeUnixNano: startNano,
    endTimeUnixNano: endNano,
    durationMs: totalMs,
    status: hasError ? "error" : "ok",
    statusMessage: hasError && errorType === "downstream_500" ? "upstream error" : null,
    attributes: {
      "http.method": route.split(" ")[0]!,
      "http.url": route.split(" ")[1]!,
      "http.status_code": hasError ? 500 : 200,
    },
    events: [],
    links: [],
    scopeName: "http",
    scopeVersion: "1.0.0",
    resourceAttributes: { "service.name": service },
    serviceName: service,
  };

  const childCount = 2 + Math.floor(Math.random() * 4);
  const childSpans: NormalizedSpan[] = [];
  const childTypes = ["db.query", "cache.get", "cache.set", "http.client"];

  for (let i = 0; i < childCount; i++) {
    const childId = randomHex(16);
    const childType = pick(childTypes);
    const childOffset = (totalMs / childCount) * i;
    const childDuration = jitter(totalMs / childCount * 0.8, 0.2);
    const childStart = msToNano(baseTimeMs + childOffset);
    const childEnd = msToNano(baseTimeMs + childOffset + childDuration);
    const isLastAndError = hasError && i === childCount - 1;

    let attrs: Record<string, string | number | boolean> = {};
    if (childType === "db.query") {
      attrs = {
        "db.system": "postgresql",
        "db.statement": pick(["SELECT * FROM users WHERE id = $1", "INSERT INTO orders VALUES ($1, $2)", "UPDATE spans SET status = $1"]),
        "db.rows_affected": Math.floor(Math.random() * 100),
      };
    } else if (childType === "cache.get" || childType === "cache.set") {
      attrs = {
        "cache.key": `${service}:${randomHex(8)}`,
        "cache.hit": Math.random() > 0.3,
      };
    } else {
      const downstream = pick(HTTP_SERVICES.filter(s => s !== service));
      attrs = {
        "http.method": "POST",
        "http.url": `http://${downstream}/internal/api`,
        "http.status_code": isLastAndError ? 500 : 200,
      };
    }

    childSpans.push({
      spanId: childId,
      traceId,
      parentSpanId: rootSpanId,
      name: childType,
      kind: 3,
      startTimeUnixNano: childStart,
      endTimeUnixNano: childEnd,
      durationMs: childDuration,
      status: isLastAndError ? "error" : "ok",
      statusMessage: isLastAndError
        ? (errorType === "db_timeout" ? "connection timeout" : errorType === "payment_declined" ? "payment declined" : "internal server error")
        : null,
      attributes: attrs,
      events: [],
      links: [],
      scopeName: "http",
      scopeVersion: "1.0.0",
      resourceAttributes: { "service.name": service },
      serviceName: service,
    });
  }

  return { spans: [rootSpan, ...childSpans], observations: [] };
}

// ─── Scenario 2: LLM Chat Completion ─────────────────────────────────────────

const LLM_SERVICES = ["llm-assistant", "document-processor"];

function makeLlmChatTrace(baseTimeMs: number): ScenarioResult {
  const traceId = randomHex(32);
  const rootSpanId = randomHex(16);
  const childSpanId = randomHex(16);
  const service = pick(LLM_SERVICES);
  const model = pickModel();
  const hasError = Math.random() < 0.08;

  const { promptMin, promptMax, completionMin, completionMax } = tokenRangeForModel(model.id);
  const promptTokens = Math.floor(promptMin + Math.random() * (promptMax - promptMin));
  const completionTokens = Math.floor(completionMin + Math.random() * (completionMax - completionMin));
  const totalTokens = promptTokens + completionTokens;
  const cost = calcCost(model, promptTokens, completionTokens);

  const childDuration = jitter(800 + promptTokens * 0.5, 0.3);
  const totalMs = childDuration + jitter(50, 0.2);

  const startNano = msToNano(baseTimeMs);
  const endNano = msToNano(baseTimeMs + totalMs);
  const childStart = msToNano(baseTimeMs + 20);
  const childEnd = msToNano(baseTimeMs + 20 + childDuration);

  const rootSpan: NormalizedSpan = {
    spanId: rootSpanId,
    traceId,
    parentSpanId: null,
    name: "llm.chat",
    kind: 2,
    startTimeUnixNano: startNano,
    endTimeUnixNano: endNano,
    durationMs: totalMs,
    status: hasError ? "error" : "ok",
    statusMessage: null,
    attributes: { "gen_ai.system": model.provider },
    events: [],
    links: [],
    scopeName: "llm",
    scopeVersion: "1.0.0",
    resourceAttributes: { "service.name": service },
    serviceName: service,
  };

  const childName = model.provider === "openai"
    ? "openai.chat.completions"
    : model.provider === "anthropic"
    ? "anthropic.messages"
    : "google.generativeai";

  const childSpan: NormalizedSpan = {
    spanId: childSpanId,
    traceId,
    parentSpanId: rootSpanId,
    name: childName,
    kind: 3,
    startTimeUnixNano: childStart,
    endTimeUnixNano: childEnd,
    durationMs: childDuration,
    status: hasError ? "error" : "ok",
    statusMessage: hasError ? "rate_limit_exceeded" : null,
    attributes: {
      "gen_ai.system": model.provider,
      "gen_ai.request.model": model.id,
      "gen_ai.usage.input_tokens": promptTokens,
      "gen_ai.usage.output_tokens": completionTokens,
      "gen_ai.response.finish_reason": hasError ? "error" : "stop",
      ...(hasError ? { "gen_ai.error.type": "rate_limit_exceeded" } : {}),
    },
    events: [],
    links: [],
    scopeName: "llm",
    scopeVersion: "1.0.0",
    resourceAttributes: { "service.name": service },
    serviceName: service,
  };

  const obs: ObservationRow[] = hasError ? [] : [{
    id: randomHex(32),
    spanId: childSpanId,
    traceId,
    model: model.id,
    provider: model.provider,
    promptTokens,
    completionTokens,
    totalTokens,
    costUsd: cost,
    prompt: pick(PROMPTS),
    completion: pick(COMPLETIONS),
    createdAt: baseTimeMs * 1000,
  }];

  return { spans: [rootSpan, childSpan], observations: obs };
}

// ─── Scenario 3: LLM Tool Calls ──────────────────────────────────────────────

const TOOL_NAMES = ["search_web", "get_weather", "read_file", "query_database", "send_email"];

function makeLlmToolCallTrace(baseTimeMs: number): ScenarioResult {
  const traceId = randomHex(32);
  const rootSpanId = randomHex(16);
  const service = "llm-assistant";
  const model = pickModel();

  const allSpans: NormalizedSpan[] = [];
  const allObs: ObservationRow[] = [];

  let cursor = baseTimeMs + 10;

  // Root
  const rootStart = msToNano(baseTimeMs);
  const { promptMin, promptMax, completionMin, completionMax } = tokenRangeForModel(model.id);

  // First LLM call (tool_calls finish reason)
  const firstLlmSpanId = randomHex(16);
  const firstPromptTokens = Math.floor(promptMin + Math.random() * (promptMax - promptMin));
  const firstCompletionTokens = Math.floor(50 + Math.random() * 150); // short, just deciding on tools
  const firstDuration = jitter(600, 0.3);

  allSpans.push({
    spanId: firstLlmSpanId,
    traceId,
    parentSpanId: rootSpanId,
    name: "llm.chat",
    kind: 3,
    startTimeUnixNano: msToNano(cursor),
    endTimeUnixNano: msToNano(cursor + firstDuration),
    durationMs: firstDuration,
    status: "ok",
    statusMessage: null,
    attributes: {
      "gen_ai.system": model.provider,
      "gen_ai.request.model": model.id,
      "gen_ai.usage.input_tokens": firstPromptTokens,
      "gen_ai.usage.output_tokens": firstCompletionTokens,
      "gen_ai.response.finish_reason": "tool_calls",
    },
    events: [],
    links: [],
    scopeName: "llm",
    scopeVersion: "1.0.0",
    resourceAttributes: { "service.name": service },
    serviceName: service,
  });

  allObs.push({
    id: randomHex(32),
    spanId: firstLlmSpanId,
    traceId,
    model: model.id,
    provider: model.provider,
    promptTokens: firstPromptTokens,
    completionTokens: firstCompletionTokens,
    totalTokens: firstPromptTokens + firstCompletionTokens,
    costUsd: calcCost(model, firstPromptTokens, firstCompletionTokens),
    prompt: pick(PROMPTS),
    completion: "I'll need to use some tools to answer this question.",
    createdAt: baseTimeMs * 1000,
  });

  cursor += firstDuration;

  // Tool call spans (1-3 tools)
  const toolCount = 1 + Math.floor(Math.random() * 3);
  for (let t = 0; t < toolCount; t++) {
    const toolName = pick(TOOL_NAMES);
    const toolDuration = jitter(300, 0.5);
    const toolHasError = Math.random() < 0.2;

    allSpans.push({
      spanId: randomHex(16),
      traceId,
      parentSpanId: firstLlmSpanId,
      name: `tool.call.${toolName}`,
      kind: 3,
      startTimeUnixNano: msToNano(cursor),
      endTimeUnixNano: msToNano(cursor + toolDuration),
      durationMs: toolDuration,
      status: toolHasError ? "error" : "ok",
      statusMessage: null,
      attributes: {
        "tool.name": toolName,
        ...(toolHasError ? { "tool.error": "Tool execution failed" } : { "tool.result": "success" }),
      },
      events: [],
      links: [],
      scopeName: "tools",
      scopeVersion: "1.0.0",
      resourceAttributes: { "service.name": service },
      serviceName: service,
    });
    cursor += toolDuration;
  }

  // Second LLM call (stop finish reason)
  const secondLlmSpanId = randomHex(16);
  const secondPromptTokens = Math.floor(firstPromptTokens + 200 + Math.random() * 500);
  const secondCompletionTokens = Math.floor(completionMin + Math.random() * (completionMax - completionMin));
  const secondDuration = jitter(800, 0.3);

  allSpans.push({
    spanId: secondLlmSpanId,
    traceId,
    parentSpanId: rootSpanId,
    name: "llm.chat",
    kind: 3,
    startTimeUnixNano: msToNano(cursor),
    endTimeUnixNano: msToNano(cursor + secondDuration),
    durationMs: secondDuration,
    status: "ok",
    statusMessage: null,
    attributes: {
      "gen_ai.system": model.provider,
      "gen_ai.request.model": model.id,
      "gen_ai.usage.input_tokens": secondPromptTokens,
      "gen_ai.usage.output_tokens": secondCompletionTokens,
      "gen_ai.response.finish_reason": "stop",
    },
    events: [],
    links: [],
    scopeName: "llm",
    scopeVersion: "1.0.0",
    resourceAttributes: { "service.name": service },
    serviceName: service,
  });

  allObs.push({
    id: randomHex(32),
    spanId: secondLlmSpanId,
    traceId,
    model: model.id,
    provider: model.provider,
    promptTokens: secondPromptTokens,
    completionTokens: secondCompletionTokens,
    totalTokens: secondPromptTokens + secondCompletionTokens,
    costUsd: calcCost(model, secondPromptTokens, secondCompletionTokens),
    prompt: pick(PROMPTS),
    completion: pick(COMPLETIONS),
    createdAt: baseTimeMs * 1000,
  });

  cursor += secondDuration;

  const totalMs = cursor - baseTimeMs;
  const rootEnd = msToNano(cursor);

  allSpans.unshift({
    spanId: rootSpanId,
    traceId,
    parentSpanId: null,
    name: "agent.run",
    kind: 2,
    startTimeUnixNano: rootStart,
    endTimeUnixNano: rootEnd,
    durationMs: totalMs,
    status: "ok",
    statusMessage: null,
    attributes: { "agent.type": "tool_use" },
    events: [],
    links: [],
    scopeName: "agent",
    scopeVersion: "1.0.0",
    resourceAttributes: { "service.name": service },
    serviceName: service,
  });

  return { spans: allSpans, observations: allObs };
}

// ─── Scenario 4: LLM Retry ───────────────────────────────────────────────────

function makeLlmRetryTrace(baseTimeMs: number): ScenarioResult {
  const traceId = randomHex(32);
  const rootSpanId = randomHex(16);
  const service = pick(["llm-assistant", "recommendation-engine"]);
  const model = pickModel();
  const errorType = pick(["rate_limit_exceeded", "context_length_exceeded"]);

  const retryDelay = jitter(1000, 0.3);
  const attempt1Duration = jitter(200, 0.3);
  const attempt2Duration = jitter(1000, 0.3);
  const totalMs = attempt1Duration + retryDelay + attempt2Duration + 30;

  const { promptMin, promptMax, completionMin, completionMax } = tokenRangeForModel(model.id);
  const promptTokens = Math.floor(promptMin + Math.random() * (promptMax - promptMin));
  const completionTokens = Math.floor(completionMin + Math.random() * (completionMax - completionMin));

  const attempt1SpanId = randomHex(16);
  const attempt2SpanId = randomHex(16);

  const retryEvent = {
    name: "retry",
    timeUnixNano: msToNano(baseTimeMs + attempt1Duration + retryDelay),
    attributes: { "retry.attempt": 1, "retry.delay_ms": Math.floor(retryDelay) },
  };

  const spans: NormalizedSpan[] = [
    {
      spanId: rootSpanId,
      traceId,
      parentSpanId: null,
      name: "llm.chat",
      kind: 2,
      startTimeUnixNano: msToNano(baseTimeMs),
      endTimeUnixNano: msToNano(baseTimeMs + totalMs),
      durationMs: totalMs,
      status: "ok",
      statusMessage: null,
      attributes: { "gen_ai.system": model.provider, "llm.retry": true },
      events: [],
      links: [],
      scopeName: "llm",
      scopeVersion: "1.0.0",
      resourceAttributes: { "service.name": service },
      serviceName: service,
    },
    {
      spanId: attempt1SpanId,
      traceId,
      parentSpanId: rootSpanId,
      name: "llm.attempt",
      kind: 3,
      startTimeUnixNano: msToNano(baseTimeMs + 10),
      endTimeUnixNano: msToNano(baseTimeMs + 10 + attempt1Duration),
      durationMs: attempt1Duration,
      status: "error",
      statusMessage: errorType,
      attributes: {
        "gen_ai.system": model.provider,
        "gen_ai.request.model": model.id,
        "gen_ai.error.type": errorType,
        "llm.attempt.number": 1,
      },
      events: [retryEvent],
      links: [],
      scopeName: "llm",
      scopeVersion: "1.0.0",
      resourceAttributes: { "service.name": service },
      serviceName: service,
    },
    {
      spanId: attempt2SpanId,
      traceId,
      parentSpanId: rootSpanId,
      name: "llm.attempt",
      kind: 3,
      startTimeUnixNano: msToNano(baseTimeMs + 10 + attempt1Duration + retryDelay),
      endTimeUnixNano: msToNano(baseTimeMs + 10 + attempt1Duration + retryDelay + attempt2Duration),
      durationMs: attempt2Duration,
      status: "ok",
      statusMessage: null,
      attributes: {
        "gen_ai.system": model.provider,
        "gen_ai.request.model": model.id,
        "gen_ai.usage.input_tokens": promptTokens,
        "gen_ai.usage.output_tokens": completionTokens,
        "gen_ai.response.finish_reason": "stop",
        "llm.attempt.number": 2,
      },
      events: [],
      links: [],
      scopeName: "llm",
      scopeVersion: "1.0.0",
      resourceAttributes: { "service.name": service },
      serviceName: service,
    },
  ];

  const obs: ObservationRow[] = [{
    id: randomHex(32),
    spanId: attempt2SpanId,
    traceId,
    model: model.id,
    provider: model.provider,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    costUsd: calcCost(model, promptTokens, completionTokens),
    prompt: pick(PROMPTS),
    completion: pick(COMPLETIONS),
    createdAt: baseTimeMs * 1000,
  }];

  return { spans, observations: obs };
}

// ─── Scenario 5: Multi-step Agent ────────────────────────────────────────────

const AGENT_STEPS = ["agent.step.retrieve", "agent.step.analyze", "agent.step.synthesize", "agent.step.respond"];
const AGENT_SERVICES = ["recommendation-engine", "document-processor"];

function makeAgentPipelineTrace(baseTimeMs: number): ScenarioResult {
  const traceId = randomHex(32);
  const rootSpanId = randomHex(16);
  const service = pick(AGENT_SERVICES);
  const model = pickModel();

  const allSpans: NormalizedSpan[] = [];
  const allObs: ObservationRow[] = [];

  let cursor = baseTimeMs + 20;
  const stepCount = 3 + Math.floor(Math.random() * 3);
  const steps = AGENT_STEPS.slice(0, Math.min(stepCount, AGENT_STEPS.length));

  for (const stepName of steps) {
    const stepSpanId = randomHex(16);
    const stepDuration = jitter(400, 0.3);
    const llmSpanId = randomHex(16);

    const { promptMin, promptMax, completionMin, completionMax } = tokenRangeForModel(model.id);
    const promptTokens = Math.floor(promptMin + Math.random() * (promptMax - promptMin));
    const completionTokens = Math.floor(completionMin + Math.random() * (completionMax - completionMin));
    const llmDuration = jitter(600, 0.3);

    allSpans.push({
      spanId: stepSpanId,
      traceId,
      parentSpanId: rootSpanId,
      name: stepName,
      kind: 3,
      startTimeUnixNano: msToNano(cursor),
      endTimeUnixNano: msToNano(cursor + stepDuration),
      durationMs: stepDuration,
      status: "ok",
      statusMessage: null,
      attributes: { "agent.step": stepName.replace("agent.step.", "") },
      events: [],
      links: [],
      scopeName: "agent",
      scopeVersion: "1.0.0",
      resourceAttributes: { "service.name": service },
      serviceName: service,
    });

    allSpans.push({
      spanId: llmSpanId,
      traceId,
      parentSpanId: stepSpanId,
      name: "llm.chat",
      kind: 3,
      startTimeUnixNano: msToNano(cursor + 10),
      endTimeUnixNano: msToNano(cursor + 10 + llmDuration),
      durationMs: llmDuration,
      status: "ok",
      statusMessage: null,
      attributes: {
        "gen_ai.system": model.provider,
        "gen_ai.request.model": model.id,
        "gen_ai.usage.input_tokens": promptTokens,
        "gen_ai.usage.output_tokens": completionTokens,
        "gen_ai.response.finish_reason": "stop",
      },
      events: [],
      links: [],
      scopeName: "llm",
      scopeVersion: "1.0.0",
      resourceAttributes: { "service.name": service },
      serviceName: service,
    });

    allObs.push({
      id: randomHex(32),
      spanId: llmSpanId,
      traceId,
      model: model.id,
      provider: model.provider,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      costUsd: calcCost(model, promptTokens, completionTokens),
      prompt: pick(PROMPTS),
      completion: pick(COMPLETIONS),
      createdAt: baseTimeMs * 1000,
    });

    cursor += Math.max(stepDuration, llmDuration + 10) + jitter(50, 0.5);
  }

  const totalMs = cursor - baseTimeMs;

  allSpans.unshift({
    spanId: rootSpanId,
    traceId,
    parentSpanId: null,
    name: "agent.pipeline",
    kind: 2,
    startTimeUnixNano: msToNano(baseTimeMs),
    endTimeUnixNano: msToNano(cursor),
    durationMs: totalMs,
    status: "ok",
    statusMessage: null,
    attributes: { "agent.steps": steps.length, "agent.model": model.id },
    events: [],
    links: [],
    scopeName: "agent",
    scopeVersion: "1.0.0",
    resourceAttributes: { "service.name": service },
    serviceName: service,
  });

  return { spans: allSpans, observations: allObs };
}

// ─── Request Handler ─────────────────────────────────────────────────────────

export async function handleSeed(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const count = Math.min(parseInt(url.searchParams.get("count") ?? "300"), 500);

    // Allocate scenario counts based on percentages
    const httpCount = Math.round(count * 0.40);
    const llmChatCount = Math.round(count * 0.25);
    const toolCallCount = Math.round(count * 0.15);
    const retryCount = Math.round(count * 0.10);
    const agentCount = count - httpCount - llmChatCount - toolCallCount - retryCount;

    const totalTraces = httpCount + llmChatCount + toolCallCount + retryCount + agentCount;
    const timestamps = generateTimestamps(totalTraces);

    const allSpans: NormalizedSpan[] = [];
    const allObs: ObservationRow[] = [];

    let tsIdx = 0;

    const runScenario = (fn: (t: number) => ScenarioResult, n: number) => {
      for (let i = 0; i < n; i++) {
        const result = fn(timestamps[tsIdx++ % timestamps.length]!);
        allSpans.push(...result.spans);
        allObs.push(...result.observations);
      }
    };

    runScenario(makeHttpTrace, httpCount);
    runScenario(makeLlmChatTrace, llmChatCount);
    runScenario(makeLlmToolCallTrace, toolCallCount);
    runScenario(makeLlmRetryTrace, retryCount);
    runScenario(makeAgentPipelineTrace, agentCount);

    const db = getDb();
    await upsertSpans(db, allSpans);

    // Insert observations directly via Drizzle
    for (const obs of allObs) {
      db.insert(observations).values(obs).onConflictDoUpdate({
        target: observations.id,
        set: {
          model: obs.model,
          totalTokens: obs.totalTokens,
          costUsd: obs.costUsd,
        },
      }).run();
    }

    return Response.json({
      ok: true,
      seeded: totalTraces,
      spans: allSpans.length,
      observations: allObs.length,
      breakdown: {
        http: httpCount,
        llmChat: llmChatCount,
        toolCalls: toolCallCount,
        retries: retryCount,
        agents: agentCount,
      },
    });
  } catch (err) {
    console.error("[Seed] error:", err);
    return internalError();
  }
}

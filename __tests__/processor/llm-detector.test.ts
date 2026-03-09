import { test, expect, describe } from "bun:test";
import { isLlmSpan, extractLlmObservation } from "../../src/processor/llm-detector";
import type { NormalizedSpan } from "../../src/processor/types";

function makeSpan(attrs: Record<string, unknown>): NormalizedSpan {
  return {
    spanId: "abc123",
    traceId: "trace001",
    parentSpanId: null,
    name: "ai.generateText",
    kind: 1,
    startTimeUnixNano: 1000000000n,
    endTimeUnixNano:   2000000000n,
    durationMs: 1000,
    status: "ok",
    statusMessage: null,
    attributes: attrs as any,
    events: [],
    links: [],
    scopeName: "ai",
    scopeVersion: "0.1.0",
    resourceAttributes: { "service.name": "test-service" },
    serviceName: "test-service",
  };
}

describe("isLlmSpan", () => {
  test("detects span with gen_ai.system", () => {
    expect(isLlmSpan(makeSpan({ "gen_ai.system": "openai" }))).toBe(true);
  });

  test("detects span with ai.model.id", () => {
    expect(isLlmSpan(makeSpan({ "ai.model.id": "gpt-4o-mini" }))).toBe(true);
  });

  test("detects span with gen_ai.request.model", () => {
    expect(isLlmSpan(makeSpan({ "gen_ai.request.model": "gpt-4o" }))).toBe(true);
  });

  test("returns false for non-LLM span", () => {
    expect(isLlmSpan(makeSpan({ "http.method": "GET" }))).toBe(false);
  });
});

describe("extractLlmObservation", () => {
  test("extracts model from gen_ai.response.model (prefers over request.model)", () => {
    const span = makeSpan({
      "gen_ai.request.model": "gpt-4o-mini",
      "gen_ai.response.model": "gpt-4o-mini-2024-07-18",
      "gen_ai.usage.input_tokens": 100,
      "gen_ai.usage.output_tokens": 50,
      "gen_ai.system": "openai",
    });
    const obs = extractLlmObservation(span);
    expect(obs.model).toBe("gpt-4o-mini-2024-07-18");
    expect(obs.promptTokens).toBe(100);
    expect(obs.completionTokens).toBe(50);
    expect(obs.totalTokens).toBe(150);
    expect(obs.provider).toBe("openai");
    expect(obs.costUsd).toBeCloseTo(0.000045, 10); // 100/1M*0.15 + 50/1M*0.60
  });

  test("falls back to ai.* attributes", () => {
    const span = makeSpan({
      "ai.model.id": "gpt-4o-mini",
      "ai.model.provider": "openai.chat",
      "ai.usage.promptTokens": 200,
      "ai.usage.completionTokens": 80,
      "ai.prompt": JSON.stringify([{ role: "user", content: "hello" }]),
      "ai.response.text": "hi there",
    });
    const obs = extractLlmObservation(span);
    expect(obs.model).toBe("gpt-4o-mini");
    expect(obs.provider).toBe("openai");  // strips ".chat" suffix
    expect(obs.promptTokens).toBe(200);
    expect(obs.completionTokens).toBe(80);
    expect(obs.prompt).toContain("hello");
    expect(obs.completion).toBe("hi there");
  });

  test("costUsd is null for unknown model", () => {
    const span = makeSpan({
      "gen_ai.system": "some-custom-llm",
      "gen_ai.request.model": "totally-unknown-model-xyz",
      "gen_ai.usage.input_tokens": 100,
      "gen_ai.usage.output_tokens": 50,
    });
    const obs = extractLlmObservation(span);
    expect(obs.costUsd).toBeNull();
  });
});

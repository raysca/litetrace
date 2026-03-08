import { test, expect, describe } from "bun:test";
import { processSpan, processSpans } from "../../src/processor/span-processor";
import type { NormalizedSpan } from "../../src/processor/types";

function makeSpan(overrides: Partial<NormalizedSpan> = {}): NormalizedSpan {
  const start = 1700000000000000000n;
  const end = 1700000000050000000n;
  return {
    spanId: "b7ad6b7169203331",
    traceId: "0af7651916cd43dd8448eb211c80319c",
    parentSpanId: null,
    name: "test span",
    kind: 0,
    startTimeUnixNano: start,
    endTimeUnixNano: end,
    durationMs: 0,
    status: "ok",
    statusMessage: null,
    attributes: {},
    events: [],
    links: [],
    scopeName: null,
    scopeVersion: null,
    resourceAttributes: {},
    serviceName: "test-service",
    ...overrides,
  };
}

describe("processSpan", () => {
  test("computes duration from nanoseconds", () => {
    const span = processSpan(makeSpan());
    expect(span.durationMs).toBeCloseTo(50);
  });

  test("sanitizes empty name to (unnamed)", () => {
    const span = processSpan(makeSpan({ name: "" }));
    expect(span.name).toBe("(unnamed)");
  });

  test("sanitizes whitespace-only name", () => {
    const span = processSpan(makeSpan({ name: "   " }));
    expect(span.name).toBe("(unnamed)");
  });

  test("falls back serviceName to unknown", () => {
    const span = processSpan(makeSpan({ serviceName: "" }));
    expect(span.serviceName).toBe("unknown");
  });

  test("preserves valid status", () => {
    const okSpan = processSpan(makeSpan({ status: "ok" }));
    expect(okSpan.status).toBe("ok");
    const errSpan = processSpan(makeSpan({ status: "error" }));
    expect(errSpan.status).toBe("error");
  });

  test("normalizes zero duration when end < start", () => {
    const span = processSpan(makeSpan({
      startTimeUnixNano: 1000n,
      endTimeUnixNano: 500n,
    }));
    expect(span.durationMs).toBe(0);
  });
});

describe("processSpans", () => {
  test("processes multiple spans", () => {
    const spans = processSpans([makeSpan(), makeSpan({ name: "other" })]);
    expect(spans).toHaveLength(2);
    expect(spans[0].durationMs).toBeGreaterThan(0);
  });
});

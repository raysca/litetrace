import { test, expect, describe, beforeEach } from "bun:test";
import { createTestDb } from "../helpers/db";
import { upsertObservation, listObservations, getTraceObservations } from "../../src/storage/observation-repository";
import type { LlmObservationData } from "../../src/processor/llm-detector";
import { traces, spans } from "../../src/db/schema";

function makeObs(overrides: Partial<LlmObservationData> = {}): LlmObservationData {
  return {
    spanId:           "span001",
    traceId:          "trace001",
    model:            "gpt-4o-mini",
    provider:         "openai",
    promptTokens:     100,
    completionTokens: 50,
    totalTokens:      150,
    costUsd:          0.000045,
    prompt:           "Hello?",
    completion:       "Hello back!",
    createdAt:        1_700_000_000_000_000,
    ...overrides,
  };
}

describe("observation-repository", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
    // Insert prerequisite trace + span rows (FK constraints)
    db.insert(traces).values({
      id: "trace001", rootSpanName: "test", serviceName: "svc",
      startTime: 1000, endTime: 2000, durationMs: 1, status: "ok", spanCount: 1,
      resourceAttributes: "{}",
    }).run();
    db.insert(spans).values({
      id: "span001", traceId: "trace001", name: "ai.generateText",
      kind: 1, startTime: 1000, endTime: 2000, durationMs: 1,
      statusCode: "ok", attributes: "{}", events: "[]", links: "[]",
    }).run();
  });

  test("upsertObservation inserts new observation", () => {
    upsertObservation(db, makeObs());
    const rows = listObservations(db, {});
    expect(rows.items).toHaveLength(1);
    expect(rows.items[0]!.model).toBe("gpt-4o-mini");
    expect(rows.items[0]!.provider).toBe("openai");
  });

  test("upsertObservation updates existing (idempotent by spanId)", () => {
    upsertObservation(db, makeObs());
    upsertObservation(db, makeObs({ completionTokens: 99, totalTokens: 199 }));
    const rows = listObservations(db, {});
    expect(rows.items).toHaveLength(1);
    expect(rows.items[0]!.completionTokens).toBe(99);
  });

  test("getTraceObservations returns observations for specific trace", () => {
    upsertObservation(db, makeObs());
    const obs = getTraceObservations(db, "trace001");
    expect(obs).toHaveLength(1);
    expect(obs[0]!.traceId).toBe("trace001");
  });

  test("listObservations filters by model", () => {
    upsertObservation(db, makeObs({ model: "gpt-4o-mini" }));
    const rows = listObservations(db, { model: "gpt-4o" });
    expect(rows.items).toHaveLength(0);
    const rows2 = listObservations(db, { model: "gpt-4o-mini" });
    expect(rows2.items).toHaveLength(1);
  });
});

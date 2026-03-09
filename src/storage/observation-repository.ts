import { eq, desc } from "drizzle-orm";
import { observations } from "../db/schema";
import type { LlmObservationData } from "../processor/llm-detector";
import { randomUUID } from "crypto";

type Db = ReturnType<typeof import("../db/client").getDb>;

export function upsertObservation(db: Db, data: LlmObservationData): void {
  db.insert(observations).values({
    id:               randomUUID(),
    spanId:           data.spanId,
    traceId:          data.traceId,
    model:            data.model,
    provider:         data.provider,
    promptTokens:     data.promptTokens,
    completionTokens: data.completionTokens,
    totalTokens:      data.totalTokens,
    costUsd:          data.costUsd,
    prompt:           data.prompt,
    completion:       data.completion,
    createdAt:        data.createdAt,
  }).onConflictDoUpdate({
    target: observations.spanId,
    set: {
      model:            data.model,
      provider:         data.provider,
      promptTokens:     data.promptTokens,
      completionTokens: data.completionTokens,
      totalTokens:      data.totalTokens,
      costUsd:          data.costUsd,
      prompt:           data.prompt,
      completion:       data.completion,
    },
  }).run();
}

export function getTraceObservations(db: Db, traceId: string) {
  return db.select().from(observations)
    .where(eq(observations.traceId, traceId))
    .all();
}

interface ObsQuery { model?: string; limit?: number; offset?: number; }

export function listObservations(db: Db, q: ObsQuery) {
  const limit = q.limit ?? 50;
  const offset = q.offset ?? 0;
  const where = q.model ? eq(observations.model, q.model) : undefined;

  const items = db.select().from(observations)
    .where(where)
    .orderBy(desc(observations.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  return { items, limit, offset };
}

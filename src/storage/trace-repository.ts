import { eq, desc, and, count, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { traces, spans } from "../db/schema";
import type { NormalizedSpan } from "../processor/types";
import { buildTraceFilters, buildPagination, type TraceQuery } from "./query-builder";

type Db = ReturnType<typeof getDb>;

function nanosToMicros(nano: bigint): number {
  return Number(nano / 1000n);
}

function stringify(v: unknown): string {
  return JSON.stringify(v, (_, val) => typeof val === "bigint" ? val.toString() : val);
}

function deriveTraceStatus(spanList: NormalizedSpan[]): string {
  if (spanList.some(s => s.status === "error")) return "error";
  if (spanList.every(s => s.status === "ok")) return "ok";
  return "unset";
}

function findRootSpan(spanList: NormalizedSpan[]): NormalizedSpan | undefined {
  return spanList.find(s => !s.parentSpanId) ?? spanList[0];
}

export async function upsertSpans(db: Db, spanList: NormalizedSpan[]): Promise<void> {
  if (spanList.length === 0) return;

  // Group by traceId
  const byTrace = new Map<string, NormalizedSpan[]>();
  for (const span of spanList) {
    const existing = byTrace.get(span.traceId) ?? [];
    existing.push(span);
    byTrace.set(span.traceId, existing);
  }

  for (const [traceId, traceSpans] of byTrace) {
    // Upsert trace FIRST (spans have FK → traces)
    const root = findRootSpan(traceSpans);
    if (!root) continue;

    const firstSpan = traceSpans[0]!;
    const startNano = traceSpans.reduce(
      (min, s) => s.startTimeUnixNano < min ? s.startTimeUnixNano : min,
      firstSpan.startTimeUnixNano
    );
    const endNano = traceSpans.reduce(
      (max, s) => s.endTimeUnixNano > max ? s.endTimeUnixNano : max,
      firstSpan.endTimeUnixNano
    );
    const durationMs = endNano > startNano
      ? Number(endNano - startNano) / 1_000_000
      : 0;
    const status = deriveTraceStatus(traceSpans);

    const existingRow = db.select({ spanCount: traces.spanCount })
      .from(traces)
      .where(eq(traces.id, traceId))
      .get();

    const newSpanCount = (existingRow?.spanCount ?? 0) + traceSpans.length;

    db.insert(traces).values({
      id: traceId,
      rootSpanName: root.name,
      serviceName: root.serviceName,
      startTime: nanosToMicros(startNano),
      endTime: nanosToMicros(endNano),
      durationMs,
      status,
      spanCount: newSpanCount,
      resourceAttributes: stringify(root.resourceAttributes),
    }).onConflictDoUpdate({
      target: traces.id,
      set: {
        endTime: nanosToMicros(endNano),
        durationMs,
        status,
        spanCount: newSpanCount,
      },
    }).run();

    // Upsert each span
    for (const span of traceSpans) {
      db.insert(spans).values({
        id: span.spanId,
        traceId: span.traceId,
        parentSpanId: span.parentSpanId,
        name: span.name,
        kind: span.kind,
        startTime: nanosToMicros(span.startTimeUnixNano),
        endTime: nanosToMicros(span.endTimeUnixNano),
        durationMs: span.durationMs,
        statusCode: span.status,
        statusMessage: span.statusMessage,
        attributes: stringify(span.attributes),
        events: stringify(span.events),
        links: stringify(span.links),
        scopeName: span.scopeName,
        scopeVersion: span.scopeVersion,
      }).onConflictDoUpdate({
        target: spans.id,
        set: {
          name: span.name,
          attributes: stringify(span.attributes),
          events: stringify(span.events),
          statusCode: span.status,
          statusMessage: span.statusMessage,
        },
      }).run();
    }
  }
}

export function listTraces(q: TraceQuery) {
  const db = getDb();
  const filters = buildTraceFilters(q);
  const { limit, offset } = buildPagination(q);

  const where = filters.length > 0 ? and(...filters) : undefined;

  const items = db.select().from(traces)
    .where(where)
    .orderBy(desc(traces.startTime))
    .limit(limit)
    .offset(offset)
    .all();

  const totalRow = db.select({ count: count() }).from(traces).where(where).get();
  const total = totalRow?.count ?? 0;

  return { items, total, limit, offset };
}

export function getTrace(traceId: string) {
  const db = getDb();
  const trace = db.select().from(traces).where(eq(traces.id, traceId)).get();
  if (!trace) return null;

  const spanList = db.select().from(spans).where(eq(spans.traceId, traceId)).all();
  return { trace, spans: spanList };
}

export function getSpan(spanId: string) {
  const db = getDb();
  return db.select().from(spans).where(eq(spans.id, spanId)).get() ?? null;
}

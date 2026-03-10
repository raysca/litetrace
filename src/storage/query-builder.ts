import { SQL, and, gte, lte, eq, sql } from "drizzle-orm";
import { traces } from "../db/schema";

export interface TraceQuery {
  from?: number;              // unix ms
  to?: number;                // unix ms
  service?: string;
  status?: string;
  spanName?: string;          // root span name filter
  latencyMinMs?: number;      // minimum latency in ms
  latencyMaxMs?: number;      // maximum latency in ms
  costMinUsd?: number;        // minimum cost in USD
  costMaxUsd?: number;        // maximum cost in USD
  limit?: number;
  offset?: number;
}

export function buildTraceFilters(q: TraceQuery): SQL[] {
  const filters: SQL[] = [];

  if (q.from !== undefined) {
    // start_time stored as unix µs; query param is ms
    filters.push(gte(traces.startTime, q.from * 1000));
  }
  if (q.to !== undefined) {
    filters.push(lte(traces.startTime, q.to * 1000));
  }
  if (q.service) {
    filters.push(eq(traces.serviceName, q.service));
  }
  if (q.status) {
    filters.push(eq(traces.status, q.status));
  }
  if (q.spanName) {
    filters.push(eq(traces.rootSpanName, q.spanName));
  }
  if (q.latencyMinMs !== undefined) {
    filters.push(gte(traces.durationMs, q.latencyMinMs));
  }
  if (q.latencyMaxMs !== undefined) {
    filters.push(lte(traces.durationMs, q.latencyMaxMs));
  }
  // Cost filters require joining with observations table
  // (defer for now; would require joining observations in listTraces)

  return filters;
}

export function buildPagination(q: TraceQuery): { limit: number; offset: number } {
  return {
    limit: Math.min(q.limit ?? 50, 500),
    offset: q.offset ?? 0,
  };
}

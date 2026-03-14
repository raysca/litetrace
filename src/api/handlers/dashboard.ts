import { getDb } from "../../db/client";
import { traces, observations } from "../../db/schema";
import { count, sum, avg, desc, gte, lte, eq, sql, and } from "drizzle-orm";
import { internalError } from "../errors";

export function handleDashboardStats(req: Request) {
  try {
    const url = new URL(req.url);
    const now = Date.now();
    const defaultFrom = now - 7 * 24 * 60 * 60 * 1000;

    const fromMs = parseInt(url.searchParams.get("from") ?? String(defaultFrom));
    const toMs = parseInt(url.searchParams.get("to") ?? String(now));

    // DB stores unix microseconds
    const fromUs = fromMs * 1000;
    const toUs = toMs * 1000;

    const db = getDb();

    const traceRow = db.select({ total: count() }).from(traces).get();
    const obsRow = db.select({
      totalCost: sum(observations.costUsd),
      totalTokens: sum(observations.totalTokens),
      obsCount: count(),
    })
      .from(observations)
      .where(and(gte(observations.createdAt, fromUs), lte(observations.createdAt, toUs)))
      .get();

    const latencyRow = db.select({ avgMs: avg(traces.durationMs) })
      .from(traces)
      .where(and(gte(traces.startTime, fromUs), lte(traces.startTime, toUs)))
      .get();

    // Model breakdown filtered by time range
    const byModel = db.select({
      model: observations.model,
      totalCost: sum(observations.costUsd),
      totalTokens: sum(observations.totalTokens),
      callCount: count(),
    })
      .from(observations)
      .where(and(gte(observations.createdAt, fromUs), lte(observations.createdAt, toUs)))
      .groupBy(observations.model)
      .orderBy(desc(count()))
      .all();

    // Volume by day — 4 metrics from traces
    const DATE_EXPR = sql<string>`strftime('%Y-%m-%d', datetime(${traces.startTime}/1000000, 'unixepoch'))`;
    const volumeTraces = db.select({
      date: DATE_EXPR.as("date"),
      requests: count(),
      avgLatencyMs: avg(traces.durationMs),
    })
      .from(traces)
      .where(and(gte(traces.startTime, fromUs), lte(traces.startTime, toUs)))
      .groupBy(DATE_EXPR)
      .orderBy(DATE_EXPR)
      .all();

    // Tokens + cost per day from observations
    const OBS_DATE_EXPR = sql<string>`strftime('%Y-%m-%d', datetime(${observations.createdAt}/1000000, 'unixepoch'))`;
    const volumeObs = db.select({
      date: OBS_DATE_EXPR.as("date"),
      tokens: sum(observations.totalTokens),
      costUsd: sum(observations.costUsd),
    })
      .from(observations)
      .where(and(gte(observations.createdAt, fromUs), lte(observations.createdAt, toUs)))
      .groupBy(OBS_DATE_EXPR)
      .orderBy(OBS_DATE_EXPR)
      .all();

    // Merge by date
    const obsMap = new Map(volumeObs.map(r => [r.date, r]));
    const volumeByDay = volumeTraces.map(r => {
      const obs = obsMap.get(r.date);
      return {
        date: r.date,
        requests: r.requests,
        tokens: parseFloat(String(obs?.tokens ?? "0")) || 0,
        costUsd: parseFloat(String(obs?.costUsd ?? "0")) || 0,
        avgLatencyMs: parseFloat(String(r.avgLatencyMs ?? "0")) || 0,
      };
    });

    // Recent errors grouped by root span name (all time)
    const recentErrors = db.select({
      name: traces.rootSpanName,
      count: count(),
    })
      .from(traces)
      .where(eq(traces.status, "error"))
      .groupBy(traces.rootSpanName)
      .orderBy(desc(count()))
      .limit(5)
      .all();

    return Response.json({
      totalTraces:   traceRow?.total ?? 0,
      totalLlmCalls: obsRow?.obsCount ?? 0,
      totalCostUsd:  parseFloat(String(obsRow?.totalCost ?? "0")) || 0,
      totalTokens:   parseFloat(String(obsRow?.totalTokens ?? "0")) || 0,
      avgLatencyMs:  parseFloat(String(latencyRow?.avgMs ?? "0")) || 0,
      byModel: byModel.map(r => ({
        model:       r.model,
        callCount:   r.callCount,
        totalCost:   parseFloat(String(r.totalCost ?? "0")) || 0,
        totalTokens: parseFloat(String(r.totalTokens ?? "0")) || 0,
      })),
      volumeByDay,
      recentErrors: recentErrors.map(r => ({ name: r.name, count: r.count })),
    });
  } catch (err) {
    console.error("handleDashboardStats error:", err);
    return internalError();
  }
}

import { getDb } from "../../db/client";
import { traces, observations } from "../../db/schema";
import { count, sum, avg, desc, gte, eq, sql } from "drizzle-orm";
import { internalError } from "../errors";

export function handleDashboardStats(_req: Request) {
  try {
    const db = getDb();

    const traceRow = db.select({ total: count() }).from(traces).get();
    const obsRow = db.select({
      totalCost: sum(observations.costUsd),
      totalTokens: sum(observations.totalTokens),
      obsCount: count(),
    }).from(observations).get();

    const latencyRow = db.select({ avgMs: avg(traces.durationMs) }).from(traces).get();

    // Model breakdown: model → total cost, tokens, calls
    const byModel = db.select({
      model: observations.model,
      totalCost: sum(observations.costUsd),
      totalTokens: sum(observations.totalTokens),
      callCount: count(),
    })
      .from(observations)
      .groupBy(observations.model)
      .orderBy(desc(count()))
      .all();

    // Volume by day — last 7 days
    const sevenDaysAgoUs = (Date.now() - 7 * 24 * 60 * 60 * 1000) * 1000;
    const volumeByDay = db.select({
      date: sql<string>`strftime('%Y-%m-%d', datetime(start_time/1000000, 'unixepoch'))`,
      requests: count(),
    })
      .from(traces)
      .where(gte(traces.startTime, sevenDaysAgoUs))
      .groupBy(sql`strftime('%Y-%m-%d', datetime(start_time/1000000, 'unixepoch'))`)
      .orderBy(sql`1`)
      .all();

    // Recent errors grouped by root span name
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
      volumeByDay: volumeByDay.map(r => ({ date: r.date, requests: r.requests })),
      recentErrors: recentErrors.map(r => ({ name: r.name, count: r.count })),
    });
  } catch (err) {
    console.error("handleDashboardStats error:", err);
    return internalError();
  }
}

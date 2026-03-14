import { getDb } from "../../db/client";
import { observations, traces } from "../../db/schema";
import { count, sum, sql, and, gte, lte } from "drizzle-orm";
import { internalError } from "../errors";

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)] ?? 0;
}

function toFloat(v: unknown): number {
  return parseFloat(String(v ?? "0")) || 0;
}

export function handleAnalyticsStats(req: Request) {
  try {
    const url = new URL(req.url);
    const now = Date.now();
    const defaultFrom = now - 30 * 24 * 60 * 60 * 1000;

    const fromMs = parseInt(url.searchParams.get("from") ?? String(defaultFrom));
    const toMs = parseInt(url.searchParams.get("to") ?? String(now));
    const durationMs = toMs - fromMs;

    // Convert ms → µs (DB stores unix µs)
    const fromUs = fromMs * 1000;
    const toUs = toMs * 1000;
    const priorFromUs = (fromMs - durationMs) * 1000;
    const priorToUs = fromMs * 1000;

    const db = getDb();

    // Current period: observations aggregates
    const currObs = db.select({
      totalCostUsd: sum(observations.costUsd),
      totalPromptTokens: sum(observations.promptTokens),
      totalCompletionTokens: sum(observations.completionTokens),
    }).from(observations)
      .where(and(gte(observations.createdAt, fromUs), lte(observations.createdAt, toUs)))
      .get();

    // Prior period: observations aggregates
    const priorObs = db.select({
      totalCostUsd: sum(observations.costUsd),
      totalPromptTokens: sum(observations.promptTokens),
      totalCompletionTokens: sum(observations.completionTokens),
    }).from(observations)
      .where(and(gte(observations.createdAt, priorFromUs), lte(observations.createdAt, priorToUs)))
      .get();

    // Current period: traces for error rate
    const currTraces = db.select({
      total: count(),
      errors: sql<number>`sum(case when ${traces.status} = 'error' then 1 else 0 end)`,
    }).from(traces)
      .where(and(gte(traces.startTime, fromUs), lte(traces.startTime, toUs)))
      .get();

    // Prior period: traces for error rate
    const priorTraces = db.select({
      total: count(),
      errors: sql<number>`sum(case when ${traces.status} = 'error' then 1 else 0 end)`,
    }).from(traces)
      .where(and(gte(traces.startTime, priorFromUs), lte(traces.startTime, priorToUs)))
      .get();

    // Latency percentiles — fetch all durationMs values
    const currDurations = db.select({ durationMs: traces.durationMs })
      .from(traces)
      .where(and(gte(traces.startTime, fromUs), lte(traces.startTime, toUs)))
      .all()
      .map(d => d.durationMs)
      .sort((a, b) => a - b);

    const priorDurations = db.select({ durationMs: traces.durationMs })
      .from(traces)
      .where(and(gte(traces.startTime, priorFromUs), lte(traces.startTime, priorToUs)))
      .all()
      .map(d => d.durationMs)
      .sort((a, b) => a - b);

    // Cost by day
    const DAY_EXPR = sql<string>`date(${observations.createdAt} / 1000000, 'unixepoch')`;
    const costByDay = db.select({
      date: DAY_EXPR.as("date"),
      costUsd: sum(observations.costUsd),
    }).from(observations)
      .where(and(gte(observations.createdAt, fromUs), lte(observations.createdAt, toUs)))
      .groupBy(DAY_EXPR)
      .orderBy(DAY_EXPR)
      .all();

    // By model
    const byModelRaw = db.select({
      model: observations.model,
      requests: count(),
      promptTokens: sum(observations.promptTokens),
      completionTokens: sum(observations.completionTokens),
      totalCostUsd: sum(observations.costUsd),
    }).from(observations)
      .where(and(gte(observations.createdAt, fromUs), lte(observations.createdAt, toUs)))
      .groupBy(observations.model)
      .all();

    // Compute summary values
    const totalCost = toFloat(currObs?.totalCostUsd);
    const priorCost = toFloat(priorObs?.totalCostUsd);
    const totalPrompt = toFloat(currObs?.totalPromptTokens);
    const totalCompletion = toFloat(currObs?.totalCompletionTokens);
    const totalTokens = totalPrompt + totalCompletion;

    const priorPrompt = toFloat(priorObs?.totalPromptTokens);
    const priorCompletion = toFloat(priorObs?.totalCompletionTokens);
    const priorTokens = priorPrompt + priorCompletion;

    const errorCount = Number(currTraces?.errors ?? 0);
    const totalCount = Number(currTraces?.total ?? 0);
    const errorRatePct = totalCount > 0 ? (errorCount / totalCount) * 100 : 0;

    const priorErrorCount = Number(priorTraces?.errors ?? 0);
    const priorTotalCount = Number(priorTraces?.total ?? 0);
    const priorErrorRatePct = priorTotalCount > 0 ? (priorErrorCount / priorTotalCount) * 100 : 0;

    const latencyP95 = percentile(currDurations, 95);
    const priorLatencyP95 = percentile(priorDurations, 95);
    const latencyP95DeltaMs = latencyP95 - priorLatencyP95;

    const costDeltaPct = priorCost > 0 ? ((totalCost - priorCost) / priorCost) * 100 : 0;
    const latencyP95DeltaPct = priorLatencyP95 > 0 ? ((latencyP95 - priorLatencyP95) / priorLatencyP95) * 100 : 0;

    const costPerKTokens = totalTokens > 0 ? (totalCost / totalTokens) * 1000 : 0;
    const priorCostPerKTokens = priorTokens > 0 ? (priorCost / priorTokens) * 1000 : 0;
    const costPerKTokensDelta = priorCostPerKTokens > 0
      ? ((costPerKTokens - priorCostPerKTokens) / priorCostPerKTokens) * 100
      : 0;

    // Parse byModel
    const totalCostForShare = totalCost || 1;
    const byModel = byModelRaw.map(r => {
      const cost = toFloat(r.totalCostUsd);
      return {
        model: r.model ?? "unknown",
        requests: r.requests,
        promptTokens: Math.round(toFloat(r.promptTokens)),
        completionTokens: Math.round(toFloat(r.completionTokens)),
        totalCostUsd: cost,
        sharePct: (cost / totalCostForShare) * 100,
      };
    });

    return Response.json({
      summary: {
        totalCostUsd: totalCost,
        totalCostDelta: costDeltaPct,
        latencyP95Ms: latencyP95,
        latencyP95DeltaMs: latencyP95DeltaMs,
        latencyP95DeltaPct: latencyP95DeltaPct,
        errorRatePct,
        errorRateDelta: errorRatePct - priorErrorRatePct,
        costPerKTokens,
        costPerKTokensDelta,
      },
      costByDay: costByDay.map(r => ({
        date: r.date,
        costUsd: toFloat(r.costUsd),
      })),
      latencyPercentiles: {
        p50: percentile(currDurations, 50),
        p90: percentile(currDurations, 90),
        p95: latencyP95,
        p99: percentile(currDurations, 99),
      },
      byModel,
    });
  } catch (err) {
    console.error("handleAnalyticsStats error:", err);
    return internalError();
  }
}

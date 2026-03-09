import { getDb } from "../../db/client";
import { observations } from "../../db/schema";
import { count, sum, sql } from "drizzle-orm";
import { internalError } from "../errors";

export function handleAnalyticsStats(_req: Request) {
  try {
    const db = getDb();

    // Group by day (createdAt is unix µs → convert to date)
    const DAY_EXPR = sql<string>`date(${observations.createdAt} / 1000000, 'unixepoch')`;

    const byDay = db.select({
      day: DAY_EXPR.as("day"),
      totalCost: sum(observations.costUsd),
      totalTokens: sum(observations.totalTokens),
      callCount: count(),
    })
      .from(observations)
      .groupBy(DAY_EXPR)
      .orderBy(DAY_EXPR)
      .all();

    const byProvider = db.select({
      provider: observations.provider,
      callCount: count(),
      totalCost: sum(observations.costUsd),
      totalTokens: sum(observations.totalTokens),
    })
      .from(observations)
      .groupBy(observations.provider)
      .all();

    // Parse sum() string results to numbers (Drizzle sum() returns string | null)
    return Response.json({
      byDay: byDay.map(r => ({
        day: r.day,
        callCount: r.callCount,
        totalCost:   parseFloat(String(r.totalCost ?? "0")) || 0,
        totalTokens: parseFloat(String(r.totalTokens ?? "0")) || 0,
      })),
      byProvider: byProvider.map(r => ({
        provider:    r.provider,
        callCount:   r.callCount,
        totalCost:   parseFloat(String(r.totalCost ?? "0")) || 0,
        totalTokens: parseFloat(String(r.totalTokens ?? "0")) || 0,
      })),
    });
  } catch (err) {
    console.error("handleAnalyticsStats error:", err);
    return internalError();
  }
}

import { getDb } from "../../db/client";
import { traces, observations } from "../../db/schema";
import { count, sum } from "drizzle-orm";
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

    // Model breakdown: model → total cost
    const byModel = db.select({
      model: observations.model,
      totalCost: sum(observations.costUsd),
      totalTokens: sum(observations.totalTokens),
      callCount: count(),
    })
      .from(observations)
      .groupBy(observations.model)
      .all();

    return Response.json({
      totalTraces:   traceRow?.total ?? 0,
      totalLlmCalls: obsRow?.obsCount ?? 0,
      totalCostUsd:  obsRow?.totalCost ?? 0,
      totalTokens:   obsRow?.totalTokens ?? 0,
      byModel,
    });
  } catch (err) {
    console.error("handleDashboardStats error:", err);
    return internalError();
  }
}

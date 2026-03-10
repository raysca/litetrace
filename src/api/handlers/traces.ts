import { listTraces, getTrace } from "../../storage/trace-repository";
import { notFound, invalidParams, internalError } from "../errors";

export async function handleListTraces(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const p = url.searchParams;

    const limit = p.has("limit") ? parseInt(p.get("limit")!) : 50;
    const offset = p.has("offset") ? parseInt(p.get("offset")!) : 0;
    const from = p.has("from") ? parseInt(p.get("from")!) : undefined;
    const to = p.has("to") ? parseInt(p.get("to")!) : undefined;
    const service = p.get("service") ?? undefined;
    const status = p.get("status") ?? undefined;
    const spanName = p.get("spanName") ?? undefined;
    const latencyMinMs = p.has("latencyMin") ? parseInt(p.get("latencyMin")!) : undefined;
    const latencyMaxMs = p.has("latencyMax") ? parseInt(p.get("latencyMax")!) : undefined;
    const costMinUsd = p.has("costMin") ? parseFloat(p.get("costMin")!) : undefined;
    const costMaxUsd = p.has("costMax") ? parseFloat(p.get("costMax")!) : undefined;

    if (isNaN(limit) || isNaN(offset)) {
      return invalidParams("limit and offset must be integers");
    }
    if (from !== undefined && isNaN(from)) return invalidParams("from must be a unix timestamp in ms");
    if (to !== undefined && isNaN(to)) return invalidParams("to must be a unix timestamp in ms");
    if (latencyMinMs !== undefined && isNaN(latencyMinMs)) return invalidParams("latencyMin must be a number (ms)");
    if (latencyMaxMs !== undefined && isNaN(latencyMaxMs)) return invalidParams("latencyMax must be a number (ms)");
    if (costMinUsd !== undefined && isNaN(costMinUsd)) return invalidParams("costMin must be a number (USD)");
    if (costMaxUsd !== undefined && isNaN(costMaxUsd)) return invalidParams("costMax must be a number (USD)");

    const result = listTraces({ limit, offset, from, to, service, status, spanName, latencyMinMs, latencyMaxMs, costMinUsd, costMaxUsd });
    return Response.json(result);
  } catch (err) {
    console.error("[API] listTraces error:", err);
    return internalError();
  }
}

export async function handleGetTrace(req: Request, traceId: string): Promise<Response> {
  try {
    const result = getTrace(traceId);
    if (!result) return notFound(`Trace ${traceId} not found`);
    return Response.json(result);
  } catch (err) {
    console.error("[API] getTrace error:", err);
    return internalError();
  }
}

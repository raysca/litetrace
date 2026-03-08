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

    if (isNaN(limit) || isNaN(offset)) {
      return invalidParams("limit and offset must be integers");
    }
    if (from !== undefined && isNaN(from)) return invalidParams("from must be a unix timestamp in ms");
    if (to !== undefined && isNaN(to)) return invalidParams("to must be a unix timestamp in ms");

    const result = listTraces({ limit, offset, from, to, service, status });
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

import { getDb } from "../../db/client";
import { listObservations, getTraceObservations } from "../../storage/observation-repository";
import { invalidParams, internalError } from "../errors";

export function handleListObservations(req: Request) {
  try {
    const url = new URL(req.url);
    const model = url.searchParams.get("model") ?? undefined;
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);
    const offset = parseInt(url.searchParams.get("offset") ?? "0");

    if (isNaN(limit) || isNaN(offset) || limit < 1 || offset < 0) return invalidParams("Invalid pagination params");

    const db = getDb();
    const result = listObservations(db, { model, limit, offset });
    return Response.json(result);
  } catch (err) {
    console.error("handleListObservations error:", err);
    return internalError();
  }
}

export function handleGetTraceObservations(_req: Request, traceId: string) {
  try {
    const db = getDb();
    const obs = getTraceObservations(db, traceId);
    return Response.json(obs);
  } catch (err) {
    console.error("handleGetTraceObservations error:", err);
    return internalError();
  }
}

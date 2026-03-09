import { getDb } from "../../db/client";
import { listObservations, getTraceObservations } from "../../storage/observation-repository";
import { invalidParams } from "../errors";

export function handleListObservations(req: Request) {
  const url = new URL(req.url);
  const model = url.searchParams.get("model") ?? undefined;
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);
  const offset = parseInt(url.searchParams.get("offset") ?? "0");

  if (isNaN(limit) || isNaN(offset)) return invalidParams("Invalid pagination params");

  const db = getDb();
  const result = listObservations(db, { model, limit, offset });
  return Response.json(result);
}

export function handleGetTraceObservations(_req: Request, traceId: string) {
  const db = getDb();
  const obs = getTraceObservations(db, traceId);
  return Response.json(obs);
}

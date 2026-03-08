import { getSpan } from "../../storage/trace-repository";
import { notFound, internalError } from "../errors";

export async function handleGetSpan(req: Request, spanId: string): Promise<Response> {
  try {
    const span = getSpan(spanId);
    if (!span) return notFound(`Span ${spanId} not found`);
    return Response.json(span);
  } catch (err) {
    console.error("[API] getSpan error:", err);
    return internalError();
  }
}

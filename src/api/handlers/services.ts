import { getServices } from "../../storage/trace-repository";
import { internalError } from "../errors";

export async function handleGetServices(req: Request): Promise<Response> {
  try {
    const services = getServices();
    return Response.json(services);
  } catch (err) {
    console.error("[API] getServices error:", err);
    return internalError();
  }
}

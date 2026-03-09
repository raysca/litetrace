import { handleListTraces, handleGetTrace } from "./handlers/traces";
import { handleGetSpan } from "./handlers/spans";
import { handleSeed } from "./handlers/seed";
import { handleChat } from "./handlers/chat";
import { notFound } from "./errors";

export function createApiRoutes() {
  return {
    "/api/traces": {
      async GET(req: Request) {
        return handleListTraces(req);
      },
    },
    "/api/traces/:traceId": {
      async GET(req: Request & { params: { traceId: string } }) {
        return handleGetTrace(req, req.params.traceId);
      },
    },
    "/api/spans/:spanId": {
      async GET(req: Request & { params: { spanId: string } }) {
        return handleGetSpan(req, req.params.spanId);
      },
    },
    "/api/debug/seed": {
      async POST(req: Request) {
        return handleSeed(req);
      },
    },
    "/api/chat": {
      async POST(req: Request) {
        return handleChat(req);
      },
    },
  };
}

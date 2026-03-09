import { handleListTraces, handleGetTrace } from "./handlers/traces";
import { handleGetSpan } from "./handlers/spans";
import { handleNorthwindQuery } from "./handlers/northwind";
import { handleSeed } from "./handlers/seed";
import { handleChat } from "./handlers/chat";
import { handleListObservations, handleGetTraceObservations } from "./handlers/observations";
import { handleDashboardStats } from "./handlers/dashboard";
import { handleAnalyticsStats } from "./handlers/analytics";
import { notFound } from "./errors";

export function createApiRoutes() {
  return {
    "/api/northwind/:entity": {
      async GET(req: Request & { params: { entity: string } }) {
        return handleNorthwindQuery(req, req.params.entity);
      },
    },
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
    "/api/observations": {
      async GET(req: Request) {
        return handleListObservations(req);
      },
    },
    "/api/traces/:traceId/observations": {
      async GET(req: Request & { params: { traceId: string } }) {
        return handleGetTraceObservations(req, req.params.traceId);
      },
    },
    "/api/dashboard/stats": {
      async GET(req: Request) {
        return handleDashboardStats(req);
      },
    },
    "/api/analytics/stats": {
      async GET(req: Request) {
        return handleAnalyticsStats(req);
      },
    },
  };
}

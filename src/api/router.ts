import { handleListTraces, handleGetTrace } from "./handlers/traces";
import { handleGetSpan } from "./handlers/spans";
import { handleSeed } from "./handlers/seed";
import { handleListObservations, handleGetTraceObservations } from "./handlers/observations";
import { handleDashboardStats } from "./handlers/dashboard";
import { handleAnalyticsStats } from "./handlers/analytics";
import { handleGetServices } from "./handlers/services";
import { handleListKeys, handleCreateKey, handleDeleteKey } from "./handlers/keys";

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
    "/api/services": {
      async GET(req: Request) {
        return handleGetServices(req);
      },
    },
    "/api/keys": {
      async GET(req: Request) {
        return handleListKeys(req);
      },
      async POST(req: Request) {
        return handleCreateKey(req);
      },
    },
    "/api/keys/:id": {
      async DELETE(req: Request & { params: { id: string } }) {
        return handleDeleteKey(req);
      },
    },
  };
}

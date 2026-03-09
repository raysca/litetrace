import { upsertSpans } from "../../storage/trace-repository";
import { getDb } from "../../db/client";
import { internalError } from "../errors";
import type { NormalizedSpan } from "../../processor/types";

function randomHex(len: number) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

function makeTrace(serviceName: string, rootName: string, spanCount = 3): NormalizedSpan[] {
  const traceId = randomHex(32);
  const rootSpanId = randomHex(16);
  const baseNano = BigInt(Date.now()) * 1_000_000n;

  const spans: NormalizedSpan[] = [
    {
      spanId: rootSpanId,
      traceId,
      parentSpanId: null,
      name: rootName,
      kind: 2,
      startTimeUnixNano: baseNano,
      endTimeUnixNano: baseNano + 120_000_000n,
      durationMs: 120,
      status: "ok",
      statusMessage: null,
      attributes: { "http.method": "GET", "http.status_code": 200 },
      events: [],
      links: [],
      scopeName: "test",
      scopeVersion: "1.0.0",
      resourceAttributes: { "service.name": serviceName },
      serviceName,
    },
  ];

  for (let i = 1; i < spanCount; i++) {
    const offsetNano = BigInt(i * 20) * 1_000_000n;
    const hasError = i === spanCount - 1 && Math.random() < 0.3;
    spans.push({
      spanId: randomHex(16),
      traceId,
      parentSpanId: rootSpanId,
      name: i % 2 === 0 ? "db.query" : "cache.get",
      kind: 3,
      startTimeUnixNano: baseNano + offsetNano,
      endTimeUnixNano: baseNano + offsetNano + 15_000_000n,
      durationMs: 15,
      status: hasError ? "error" : "ok",
      statusMessage: hasError ? "connection timeout" : null,
      attributes: i % 2 === 0
        ? { "db.system": "sqlite", "db.statement": "SELECT * FROM spans LIMIT 10" }
        : { "cache.key": `user:${i}`, "cache.hit": true },
      events: [],
      links: [],
      scopeName: "test",
      scopeVersion: "1.0.0",
      resourceAttributes: { "service.name": serviceName },
      serviceName,
    });
  }

  return spans;
}

const SERVICES = ["api-gateway", "user-service", "order-service", "payment-service"];
const ROUTES = [
  "GET /api/users",
  "POST /api/orders",
  "GET /api/products",
  "PUT /api/users/:id",
  "DELETE /api/sessions",
];

export async function handleSeed(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const count = Math.min(parseInt(url.searchParams.get("count") ?? "10"), 100);

    const db = getDb();
    const allSpans: NormalizedSpan[] = [];

    for (let i = 0; i < count; i++) {
      const service = SERVICES[i % SERVICES.length]!;
      const route = ROUTES[i % ROUTES.length]!;
      allSpans.push(...makeTrace(service, route, 2 + (i % 4)));
    }

    await upsertSpans(db, allSpans);

    return Response.json({
      ok: true,
      seeded: count,
      spans: allSpans.length,
    });
  } catch (err) {
    console.error("[Seed] error:", err);
    return internalError();
  }
}

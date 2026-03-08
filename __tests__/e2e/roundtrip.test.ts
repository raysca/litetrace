import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import validTrace from "../fixtures/trace.otlp.json";

// E2E: assumes the server is already running on localhost:4318 and :3000
// Skip if SKIP_E2E env is set
const SKIP = process.env.SKIP_E2E === "1";

describe.skipIf(SKIP)("E2E roundtrip", () => {
  const OTLP_URL = "http://localhost:4318";
  const API_URL = "http://localhost:3000";

  test("POST /v1/traces ingests data", async () => {
    const res = await fetch(`${OTLP_URL}/v1/traces`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validTrace),
    });
    expect(res.status).toBe(200);
  });

  test("GET /api/traces returns ingested trace after flush", async () => {
    // Wait for flush (default 100ms)
    await Bun.sleep(300);

    const res = await fetch(`${API_URL}/api/traces`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.total).toBeGreaterThanOrEqual(1);
    expect(data.items.length).toBeGreaterThanOrEqual(1);
    expect(data.items[0].serviceName).toBe("test-service");
  });

  test("GET /api/traces/:id returns trace with spans", async () => {
    const listRes = await fetch(`${API_URL}/api/traces`);
    const { items } = await listRes.json();
    const traceId = items[0].id;

    const res = await fetch(`${API_URL}/api/traces/${traceId}`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.trace).toBeDefined();
    expect(data.spans).toBeArray();
    expect(data.spans.length).toBeGreaterThanOrEqual(2);
  });

  test("GET /api/traces/:id returns 404 for unknown trace", async () => {
    const res = await fetch(`${API_URL}/api/traces/deadbeef00000000000000000000dead`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error.code).toBe("NOT_FOUND");
  });
});

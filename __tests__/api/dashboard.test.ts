import { test, expect, describe } from "bun:test";
import { handleDashboardStats } from "../../src/api/handlers/dashboard";

describe("handleDashboardStats", () => {
  test("returns 200 with no query params (defaults to last 7 days)", async () => {
    const req = new Request("http://localhost:3000/api/dashboard/stats");
    const res = await handleDashboardStats(req);
    expect(res.status).toBe(200);
  });

  test("returns 200 with explicit from/to params", async () => {
    const to = Date.now();
    const from = to - 7 * 24 * 60 * 60 * 1000;
    const req = new Request(`http://localhost:3000/api/dashboard/stats?from=${from}&to=${to}`);
    const res = await handleDashboardStats(req);
    expect(res.status).toBe(200);
  });

  test("returns 200 with a 30-day range", async () => {
    const to = Date.now();
    const from = to - 30 * 24 * 60 * 60 * 1000;
    const req = new Request(`http://localhost:3000/api/dashboard/stats?from=${from}&to=${to}`);
    const res = await handleDashboardStats(req);
    expect(res.status).toBe(200);
  });

  test("response contains all required top-level fields", async () => {
    const req = new Request("http://localhost:3000/api/dashboard/stats");
    const res = await handleDashboardStats(req);
    const json = await res.json();

    expect(json).toHaveProperty("totalTraces");
    expect(json).toHaveProperty("totalLlmCalls");
    expect(json).toHaveProperty("totalCostUsd");
    expect(json).toHaveProperty("totalTokens");
    expect(json).toHaveProperty("avgLatencyMs");
    expect(json).toHaveProperty("byModel");
    expect(json).toHaveProperty("volumeByDay");
    expect(json).toHaveProperty("recentErrors");
  });

  test("volumeByDay entries contain all 4 metrics", async () => {
    const req = new Request("http://localhost:3000/api/dashboard/stats");
    const res = await handleDashboardStats(req);
    const json = await res.json();

    expect(Array.isArray(json.volumeByDay)).toBe(true);
    // If there are any entries, they must have all 4 metric fields
    for (const entry of json.volumeByDay) {
      expect(entry).toHaveProperty("date");
      expect(entry).toHaveProperty("requests");
      expect(entry).toHaveProperty("tokens");
      expect(entry).toHaveProperty("costUsd");
      expect(entry).toHaveProperty("avgLatencyMs");
      expect(typeof entry.date).toBe("string");
      expect(typeof entry.requests).toBe("number");
      expect(typeof entry.tokens).toBe("number");
      expect(typeof entry.costUsd).toBe("number");
      expect(typeof entry.avgLatencyMs).toBe("number");
    }
  });

  test("numeric fields are numbers, not strings", async () => {
    const req = new Request("http://localhost:3000/api/dashboard/stats");
    const res = await handleDashboardStats(req);
    const json = await res.json();

    expect(typeof json.totalTraces).toBe("number");
    expect(typeof json.totalLlmCalls).toBe("number");
    expect(typeof json.totalCostUsd).toBe("number");
    expect(typeof json.totalTokens).toBe("number");
    expect(typeof json.avgLatencyMs).toBe("number");
  });

  test("byModel entries have required fields", async () => {
    const req = new Request("http://localhost:3000/api/dashboard/stats");
    const res = await handleDashboardStats(req);
    const json = await res.json();

    expect(Array.isArray(json.byModel)).toBe(true);
    for (const entry of json.byModel) {
      expect(entry).toHaveProperty("model");
      expect(entry).toHaveProperty("callCount");
      expect(entry).toHaveProperty("totalCost");
      expect(entry).toHaveProperty("totalTokens");
    }
  });

  test("recentErrors entries have name and count fields", async () => {
    const req = new Request("http://localhost:3000/api/dashboard/stats");
    const res = await handleDashboardStats(req);
    const json = await res.json();

    expect(Array.isArray(json.recentErrors)).toBe(true);
    for (const entry of json.recentErrors) {
      expect(entry).toHaveProperty("name");
      expect(entry).toHaveProperty("count");
    }
  });

  test("future time range returns empty volumeByDay", async () => {
    const from = Date.now() + 365 * 24 * 60 * 60 * 1000;
    const to = from + 7 * 24 * 60 * 60 * 1000;
    const req = new Request(`http://localhost:3000/api/dashboard/stats?from=${from}&to=${to}`);
    const res = await handleDashboardStats(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.volumeByDay).toEqual([]);
  });

  test("very old time range returns zero totals", async () => {
    const from = new Date("2000-01-01").getTime();
    const to = new Date("2000-01-07").getTime();
    const req = new Request(`http://localhost:3000/api/dashboard/stats?from=${from}&to=${to}`);
    const res = await handleDashboardStats(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.totalLlmCalls).toBe(0);
    expect(json.totalCostUsd).toBe(0);
    expect(json.volumeByDay).toEqual([]);
  });
});

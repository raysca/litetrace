import { test, expect, describe } from "bun:test";
import { buildTraceFilters, type TraceQuery } from "../../src/storage/query-builder";

describe("buildTraceFilters - Extended", () => {
  test("builds filter for spanName", () => {
    const q: TraceQuery = { spanName: "processRequest" };
    const filters = buildTraceFilters(q);
    expect(filters.length).toBe(1);
    expect(filters[0]).toBeDefined();
  });

  test("builds filter for latencyMinMs", () => {
    const q: TraceQuery = { latencyMinMs: 100 };
    const filters = buildTraceFilters(q);
    expect(filters.length).toBe(1);
  });

  test("builds filter for latencyMaxMs", () => {
    const q: TraceQuery = { latencyMaxMs: 500 };
    const filters = buildTraceFilters(q);
    expect(filters.length).toBe(1);
  });

  test("builds filters for latency range", () => {
    const q: TraceQuery = { latencyMinMs: 100, latencyMaxMs: 500 };
    const filters = buildTraceFilters(q);
    expect(filters.length).toBe(2);
  });

  test("combines all existing filter types with new filters", () => {
    const q: TraceQuery = {
      service: "api",
      status: "error",
      spanName: "error_handler",
      latencyMinMs: 1000,
      latencyMaxMs: 5000,
    };
    const filters = buildTraceFilters(q);
    expect(filters.length).toBe(5);
  });

  test("handles undefined latency filters correctly", () => {
    const q: TraceQuery = {
      service: "api",
      latencyMinMs: undefined,
      latencyMaxMs: undefined,
    };
    const filters = buildTraceFilters(q);
    // Should only have the service filter
    expect(filters.length).toBe(1);
  });

  test("handles zero latency values", () => {
    const q: TraceQuery = {
      latencyMinMs: 0,
      latencyMaxMs: 0,
    };
    const filters = buildTraceFilters(q);
    expect(filters.length).toBe(2);
  });

  test("ignores empty spanName", () => {
    const q: TraceQuery = {
      spanName: "",
    };
    const filters = buildTraceFilters(q);
    expect(filters.length).toBe(0);
  });

  test("returns empty filters array when no filters provided", () => {
    const q: TraceQuery = {};
    const filters = buildTraceFilters(q);
    expect(filters.length).toBe(0);
  });
});

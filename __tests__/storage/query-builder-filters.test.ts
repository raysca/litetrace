import { test, expect, describe } from "bun:test";
import { buildTraceFilters, TraceQuery } from "../../src/storage/query-builder";

describe("buildTraceFilters with new filter types", () => {
  test("builds latency range filters", () => {
    const query: TraceQuery = {
      latencyMinMs: 100,
      latencyMaxMs: 500,
    };

    const filters = buildTraceFilters(query);

    expect(filters.length).toBe(2);
    // Both should be SQL filter objects (we can't easily compare SQL objects)
    expect(filters[0]).toBeDefined();
    expect(filters[1]).toBeDefined();
  });

  test("builds span name filter", () => {
    const query: TraceQuery = {
      spanName: "my-span-name",
    };

    const filters = buildTraceFilters(query);

    expect(filters.length).toBe(1);
    expect(filters[0]).toBeDefined();
  });

  test("builds cost range filters", () => {
    const query: TraceQuery = {
      costMinUsd: 0.01,
      costMaxUsd: 0.10,
    };

    const filters = buildTraceFilters(query);

    // Cost filters are deferred, so this should be empty for now
    // Once cost filtering is implemented, this test should be updated
    expect(filters.length).toBe(0);
  });

  test("combines latency filters with existing filters", () => {
    const query: TraceQuery = {
      service: "my-service",
      status: "error",
      latencyMinMs: 100,
      latencyMaxMs: 500,
    };

    const filters = buildTraceFilters(query);

    // Should have: service, status, latencyMin, latencyMax
    expect(filters.length).toBe(4);
  });

  test("handles undefined filter boundaries correctly", () => {
    const query: TraceQuery = {
      latencyMinMs: 100,
      // latencyMaxMs is undefined
    };

    const filters = buildTraceFilters(query);

    expect(filters.length).toBe(1);
    expect(filters[0]).toBeDefined();
  });

  test("builds filters with only span name", () => {
    const query: TraceQuery = {
      spanName: "root-span",
    };

    const filters = buildTraceFilters(query);

    expect(filters.length).toBe(1);
  });

  test("combines all filter types correctly", () => {
    const query: TraceQuery = {
      from: 1000,
      to: 2000,
      service: "my-service",
      status: "ok",
      spanName: "my-span",
      latencyMinMs: 100,
      latencyMaxMs: 500,
    };

    const filters = buildTraceFilters(query);

    // from, to, service, status, spanName, latencyMin, latencyMax = 7 filters
    expect(filters.length).toBe(7);
  });
});

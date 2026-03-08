import { test, expect, describe } from "bun:test";
import { convertOtlpJson } from "../../src/processor/otlp-json-converter";
import validTrace from "../fixtures/trace.otlp.json";
import malformedTrace from "../fixtures/trace.malformed.json";

describe("convertOtlpJson", () => {
  test("converts valid OTLP JSON to NormalizedSpans", () => {
    const spans = convertOtlpJson(validTrace);
    expect(spans).toHaveLength(2);

    const root = spans.find(s => !s.parentSpanId);
    expect(root).toBeDefined();
    expect(root!.name).toBe("GET /api/users");
    expect(root!.serviceName).toBe("test-service");
    expect(root!.status).toBe("ok");
    expect(root!.traceId).toBe("0af7651916cd43dd8448eb211c80319c");
    expect(root!.durationMs).toBeCloseTo(50);
  });

  test("extracts service name from resource attributes", () => {
    const spans = convertOtlpJson(validTrace);
    expect(spans.every(s => s.serviceName === "test-service")).toBe(true);
  });

  test("handles parent-child relationship", () => {
    const spans = convertOtlpJson(validTrace);
    const child = spans.find(s => s.parentSpanId !== null);
    expect(child).toBeDefined();
    expect(child!.name).toBe("db.query");
    expect(child!.parentSpanId).toBe("b7ad6b7169203331");
  });

  test("skips spans with missing traceId or spanId", () => {
    const spans = convertOtlpJson(malformedTrace);
    expect(spans).toHaveLength(0);
  });

  test("handles empty resourceSpans", () => {
    const spans = convertOtlpJson({ resourceSpans: [] });
    expect(spans).toHaveLength(0);
  });

  test("parses attributes correctly", () => {
    const spans = convertOtlpJson(validTrace);
    const root = spans.find(s => !s.parentSpanId)!;
    expect(root.attributes["http.method"]).toBe("GET");
    expect(root.attributes["http.status_code"]).toBe(200);
  });
});

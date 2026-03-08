import protobuf from "protobufjs";
import type { NormalizedSpan, SpanKind, StatusCode, AttributeValue, SpanEvent, SpanLink } from "./types";

// Minimal inline proto definition for OTLP trace service
const OTLP_PROTO = `
syntax = "proto3";
package opentelemetry.proto.collector.trace.v1;

message ExportTraceServiceRequest {
  repeated ResourceSpans resource_spans = 1;
}
message ResourceSpans {
  Resource resource = 1;
  repeated ScopeSpans scope_spans = 2;
}
message Resource {
  repeated KeyValue attributes = 1;
}
message ScopeSpans {
  InstrumentationScope scope = 1;
  repeated Span spans = 2;
}
message InstrumentationScope {
  string name = 1;
  string version = 2;
}
message Span {
  bytes trace_id = 1;
  bytes span_id = 2;
  bytes parent_span_id = 4;
  string name = 5;
  int32 kind = 6;
  fixed64 start_time_unix_nano = 7;
  fixed64 end_time_unix_nano = 8;
  repeated KeyValue attributes = 9;
  repeated Event events = 11;
  repeated Link links = 13;
  Status status = 15;
}
message Status {
  string message = 2;
  int32 code = 3;
}
message Event {
  fixed64 time_unix_nano = 1;
  string name = 2;
  repeated KeyValue attributes = 3;
}
message Link {
  bytes trace_id = 1;
  bytes span_id = 2;
  repeated KeyValue attributes = 5;
}
message KeyValue {
  string key = 1;
  AnyValue value = 2;
}
message AnyValue {
  oneof value {
    string string_value = 1;
    bool bool_value = 2;
    int64 int_value = 3;
    double double_value = 4;
    ArrayValue array_value = 5;
  }
}
message ArrayValue {
  repeated AnyValue values = 1;
}
`;

let _root: protobuf.Root | null = null;
function getRoot(): protobuf.Root {
  if (!_root) {
    _root = protobuf.parse(OTLP_PROTO, { keepCase: true }).root;
  }
  return _root;
}

function bytesToHex(bytes: Uint8Array | null | undefined): string {
  if (!bytes || bytes.length === 0) return "";
  return Buffer.from(bytes).toString("hex");
}

function parseAnyValue(v: Record<string, unknown>): AttributeValue {
  if ("string_value" in v) return v.string_value as string;
  if ("bool_value" in v) return v.bool_value as boolean;
  if ("int_value" in v) {
    const n = v.int_value;
    return typeof n === "object" && n !== null && "toNumber" in n
      ? (n as { toNumber(): number }).toNumber()
      : Number(n);
  }
  if ("double_value" in v) return v.double_value as number;
  if ("array_value" in v) {
    const arr = v.array_value as { values?: Record<string, unknown>[] };
    return (arr.values ?? []).map(parseAnyValue) as string[] | number[] | boolean[];
  }
  return null;
}

function parseAttributes(kvs?: Record<string, unknown>[]): Record<string, AttributeValue> {
  if (!kvs) return {};
  const result: Record<string, AttributeValue> = {};
  for (const kv of kvs) {
    result[kv.key as string] = parseAnyValue(kv.value as Record<string, unknown>);
  }
  return result;
}

function parseStatusCode(code?: number): StatusCode {
  if (code === 2) return "error";
  if (code === 1) return "ok";
  return "unset";
}

function toNano(val: unknown): bigint {
  if (!val) return 0n;
  if (typeof val === "bigint") return val;
  if (typeof val === "object" && val !== null && "toNumber" in val) {
    return BigInt((val as { toNumber(): number }).toNumber());
  }
  return BigInt(String(val));
}

export async function convertOtlpProto(buffer: Uint8Array): Promise<NormalizedSpan[]> {
  const root = getRoot();
  const ExportReq = root.lookupType(
    "opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest"
  );
  const msg = ExportReq.decode(buffer) as unknown as {
    resource_spans?: Array<{
      resource?: { attributes?: Record<string, unknown>[] };
      scope_spans?: Array<{
        scope?: { name?: string; version?: string };
        spans?: Array<{
          trace_id?: Uint8Array;
          span_id?: Uint8Array;
          parent_span_id?: Uint8Array;
          name?: string;
          kind?: number;
          start_time_unix_nano?: unknown;
          end_time_unix_nano?: unknown;
          attributes?: Record<string, unknown>[];
          events?: Array<{
            name?: string;
            time_unix_nano?: unknown;
            attributes?: Record<string, unknown>[];
          }>;
          links?: Array<{
            trace_id?: Uint8Array;
            span_id?: Uint8Array;
            attributes?: Record<string, unknown>[];
          }>;
          status?: { code?: number; message?: string };
        }>;
      }>;
    }>;
  };

  const spans: NormalizedSpan[] = [];

  for (const rs of msg.resource_spans ?? []) {
    const resourceAttributes = parseAttributes(rs.resource?.attributes);
    const serviceName = (resourceAttributes["service.name"] as string) ?? "unknown";

    for (const ss of rs.scope_spans ?? []) {
      const scopeName = ss.scope?.name ?? null;
      const scopeVersion = ss.scope?.version ?? null;

      for (const span of ss.spans ?? []) {
        const traceId = bytesToHex(span.trace_id);
        const spanId = bytesToHex(span.span_id);
        if (!traceId || !spanId) continue;

        const startNano = toNano(span.start_time_unix_nano);
        const endNano = toNano(span.end_time_unix_nano);
        const durationMs = endNano > startNano
          ? Number(endNano - startNano) / 1_000_000
          : 0;

        const events: SpanEvent[] = (span.events ?? []).map(e => ({
          name: e.name ?? "",
          timeUnixNano: toNano(e.time_unix_nano),
          attributes: parseAttributes(e.attributes),
        }));

        const links: SpanLink[] = (span.links ?? []).map(l => ({
          traceId: bytesToHex(l.trace_id),
          spanId: bytesToHex(l.span_id),
          attributes: parseAttributes(l.attributes),
        }));

        spans.push({
          spanId,
          traceId,
          parentSpanId: span.parent_span_id && span.parent_span_id.length > 0
            ? bytesToHex(span.parent_span_id)
            : null,
          name: span.name ?? "",
          kind: (span.kind ?? 0) as SpanKind,
          startTimeUnixNano: startNano,
          endTimeUnixNano: endNano,
          durationMs,
          status: parseStatusCode(span.status?.code),
          statusMessage: span.status?.message ?? null,
          attributes: parseAttributes(span.attributes),
          events,
          links,
          scopeName,
          scopeVersion,
          resourceAttributes,
          serviceName,
        });
      }
    }
  }

  return spans;
}

import type { NormalizedSpan, SpanKind, StatusCode, AttributeValue, SpanEvent, SpanLink } from "./types";

// OTLP JSON types (subset we need)
interface OtlpAnyValue {
  stringValue?: string;
  intValue?: string | number;
  doubleValue?: number;
  boolValue?: boolean;
  arrayValue?: { values: OtlpAnyValue[] };
}

interface OtlpKeyValue {
  key: string;
  value: OtlpAnyValue;
}

interface OtlpEvent {
  name: string;
  timeUnixNano?: string;
  attributes?: OtlpKeyValue[];
}

interface OtlpLink {
  traceId?: string;
  spanId?: string;
  attributes?: OtlpKeyValue[];
}

interface OtlpStatus {
  code?: number;
  message?: string;
}

interface OtlpSpan {
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  name?: string;
  kind?: number;
  startTimeUnixNano?: string;
  endTimeUnixNano?: string;
  status?: OtlpStatus;
  attributes?: OtlpKeyValue[];
  events?: OtlpEvent[];
  links?: OtlpLink[];
}

interface OtlpScope {
  name?: string;
  version?: string;
}

interface OtlpScopeSpans {
  scope?: OtlpScope;
  spans?: OtlpSpan[];
}

interface OtlpResourceSpans {
  resource?: { attributes?: OtlpKeyValue[] };
  scopeSpans?: OtlpScopeSpans[];
}

interface OtlpExportRequest {
  resourceSpans?: OtlpResourceSpans[];
}

function parseAnyValue(v: OtlpAnyValue): AttributeValue {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.boolValue !== undefined) return v.boolValue;
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.intValue !== undefined) return typeof v.intValue === "string" ? parseInt(v.intValue, 10) : v.intValue;
  if (v.arrayValue?.values) {
    return v.arrayValue.values.map(parseAnyValue) as string[] | number[] | boolean[];
  }
  return null;
}

function parseAttributes(kvs?: OtlpKeyValue[]): Record<string, AttributeValue> {
  if (!kvs) return {};
  const result: Record<string, AttributeValue> = {};
  for (const kv of kvs) {
    result[kv.key] = parseAnyValue(kv.value);
  }
  return result;
}

function parseStatusCode(code?: number): StatusCode {
  if (code === 2) return "error";
  if (code === 1) return "ok";
  return "unset";
}

function toHex(val?: string): string {
  if (!val) return "";
  // Already hex if length is 32 or 16
  if (/^[0-9a-f]+$/i.test(val)) return val.toLowerCase();
  // Base64 → hex
  const bytes = Buffer.from(val, "base64");
  return bytes.toString("hex");
}

function parseNano(val?: string): bigint {
  if (!val) return 0n;
  try { return BigInt(val); } catch { return 0n; }
}

function parseEvents(events?: OtlpEvent[]): SpanEvent[] {
  if (!events) return [];
  return events.map(e => ({
    name: e.name ?? "",
    timeUnixNano: parseNano(e.timeUnixNano),
    attributes: parseAttributes(e.attributes),
  }));
}

function parseLinks(links?: OtlpLink[]): SpanLink[] {
  if (!links) return [];
  return links.map(l => ({
    traceId: toHex(l.traceId),
    spanId: toHex(l.spanId),
    attributes: parseAttributes(l.attributes),
  }));
}

export function convertOtlpJson(body: unknown): NormalizedSpan[] {
  const req = body as OtlpExportRequest;
  const spans: NormalizedSpan[] = [];

  for (const rs of req.resourceSpans ?? []) {
    const resourceAttributes = parseAttributes(rs.resource?.attributes);
    const serviceName = (resourceAttributes["service.name"] as string) ?? "unknown";

    for (const ss of rs.scopeSpans ?? []) {
      const scopeName = ss.scope?.name ?? null;
      const scopeVersion = ss.scope?.version ?? null;

      for (const span of ss.spans ?? []) {
        const traceId = toHex(span.traceId);
        const spanId = toHex(span.spanId);

        if (!traceId || !spanId) continue;

        const startNano = parseNano(span.startTimeUnixNano);
        const endNano = parseNano(span.endTimeUnixNano);
        const durationMs = endNano > startNano
          ? Number(endNano - startNano) / 1_000_000
          : 0;

        spans.push({
          spanId,
          traceId,
          parentSpanId: span.parentSpanId ? toHex(span.parentSpanId) : null,
          name: span.name ?? "",
          kind: (span.kind ?? 0) as SpanKind,
          startTimeUnixNano: startNano,
          endTimeUnixNano: endNano,
          durationMs,
          status: parseStatusCode(span.status?.code),
          statusMessage: span.status?.message ?? null,
          attributes: parseAttributes(span.attributes),
          events: parseEvents(span.events),
          links: parseLinks(span.links),
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

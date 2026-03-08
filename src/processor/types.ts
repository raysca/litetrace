export type SpanKind = 0 | 1 | 2 | 3 | 4;
export type StatusCode = "ok" | "error" | "unset";
export type AttributeValue = string | number | boolean | string[] | number[] | boolean[] | null;

export interface SpanEvent {
  name: string;
  timeUnixNano: bigint;
  attributes: Record<string, AttributeValue>;
}

export interface SpanLink {
  traceId: string;
  spanId: string;
  attributes: Record<string, AttributeValue>;
}

export interface NormalizedSpan {
  spanId: string;              // hex 16 chars
  traceId: string;             // hex 32 chars
  parentSpanId: string | null;
  name: string;
  kind: SpanKind;
  startTimeUnixNano: bigint;
  endTimeUnixNano: bigint;
  durationMs: number;
  status: StatusCode;
  statusMessage: string | null;
  attributes: Record<string, AttributeValue>;
  events: SpanEvent[];
  links: SpanLink[];
  scopeName: string | null;
  scopeVersion: string | null;
  resourceAttributes: Record<string, AttributeValue>;
  serviceName: string;         // extracted from resource.attributes["service.name"]
}

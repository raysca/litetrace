import type { NormalizedSpan, StatusCode } from "./types";

function sanitizeString(s: string | null | undefined): string {
  if (!s) return "";
  return s.trim().slice(0, 1024);
}

function computeStatus(span: NormalizedSpan): StatusCode {
  // Already normalized; trust incoming status unless unknown value
  const s = span.status;
  if (s === "ok" || s === "error" || s === "unset") return s;
  return "unset";
}

export function processSpan(span: NormalizedSpan): NormalizedSpan {
  const startNano = span.startTimeUnixNano;
  const endNano = span.endTimeUnixNano;

  const durationMs = endNano > startNano
    ? Number(endNano - startNano) / 1_000_000
    : 0;

  return {
    ...span,
    name: sanitizeString(span.name) || "(unnamed)",
    serviceName: sanitizeString(span.serviceName) || "unknown",
    statusMessage: span.statusMessage ? sanitizeString(span.statusMessage) : null,
    durationMs,
    status: computeStatus(span),
  };
}

export function processSpans(spans: NormalizedSpan[]): NormalizedSpan[] {
  return spans.map(processSpan);
}

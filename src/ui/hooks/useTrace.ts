import { useState, useEffect } from "react";

export interface SpanRow {
  id: string;
  traceId: string;
  parentSpanId: string | null;
  name: string;
  kind: number;
  startTime: number;
  endTime: number;
  durationMs: number;
  statusCode: string;
  statusMessage: string | null;
  attributes: string;
  events: string;
  links: string;
  scopeName: string | null;
  scopeVersion: string | null;
}

interface TraceDetail {
  trace: {
    id: string;
    rootSpanName: string;
    serviceName: string;
    startTime: number;
    endTime: number;
    durationMs: number;
    status: string;
    spanCount: number;
  };
  spans: SpanRow[];
}

interface UseTraceResult {
  data: TraceDetail | null;
  loading: boolean;
  error: string | null;
}

export function useTrace(traceId: string): UseTraceResult {
  const [data, setData] = useState<TraceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!traceId) return;
    setLoading(true);
    setError(null);

    fetch(`/api/traces/${traceId}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch(e => setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, [traceId]);

  return { data, loading, error };
}

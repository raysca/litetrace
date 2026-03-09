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

interface Observation {
  id: string;
  spanId: string;
  model: string | null;
  provider: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  costUsd: number | null;
  prompt: string | null;
  completion: string | null;
}

interface TraceData {
  trace: any;
  spans: any[];
  observations: Observation[];
}

export function useTrace(traceId: string) {
  const [data, setData] = useState<TraceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!traceId) return;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/traces/${traceId}`).then(r => r.json()),
      fetch(`/api/traces/${traceId}/observations`).then(r => r.json()),
    ])
      .then(([traceJson, obsJson]) => {
        if (traceJson.error) throw new Error(traceJson.error.message ?? "Not found");
        setData({ trace: traceJson.trace, spans: traceJson.spans, observations: obsJson });
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [traceId]);

  return { data, loading, error };
}

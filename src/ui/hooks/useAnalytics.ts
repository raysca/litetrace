import { useState, useEffect, useCallback } from "react";

export interface AnalyticsData {
  summary: {
    totalCostUsd: number;
    totalCostDelta: number;
    latencyP95Ms: number;
    latencyP95DeltaMs: number;
    latencyP95DeltaPct: number;
    errorRatePct: number;
    errorRateDelta: number;
    costPerKTokens: number;
    costPerKTokensDelta: number;
  };
  costByDay: { date: string; costUsd: number }[];
  latencyPercentiles: { p50: number; p90: number; p95: number; p99: number };
  byModel: {
    model: string;
    requests: number;
    promptTokens: number;
    completionTokens: number;
    totalCostUsd: number;
    sharePct: number;
  }[];
}

export function useAnalytics(from: number, to: number): {
  data: AnalyticsData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from: String(from), to: String(to) });
      const res = await fetch(`/api/analytics/stats?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [from, to, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refresh: () => setTick(t => t + 1) };
}

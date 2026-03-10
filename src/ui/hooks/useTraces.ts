import { useState, useEffect, useCallback } from "react";

export interface TraceRow {
  id: string;
  rootSpanName: string;
  serviceName: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  status: string;
  spanCount: number;
  resourceAttributes: string;
  model: string | null;
  totalTokens: string | null;
  totalCost: string | null;
}

interface TraceFilters {
  service?: string;
  status?: string;
  from?: number;
  to?: number;
  spanName?: string;
  latencyMinMs?: number;
  latencyMaxMs?: number;
  costMinUsd?: number;
  costMaxUsd?: number;
}

interface UseTracesResult {
  items: TraceRow[];
  total: number;
  limit: number;
  offset: number;
  loading: boolean;
  error: string | null;
  setPage: (offset: number) => void;
  setFilters: (f: TraceFilters) => void;
  refresh: () => void;
}

export function useTraces(pageSize = 50): UseTracesResult {
  const [items, setItems] = useState<TraceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TraceFilters>({});
  const [tick, setTick] = useState(0);

  const fetchTraces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(offset),
      });
      if (filters.service) params.set("service", filters.service);
      if (filters.status) params.set("status", filters.status);
      if (filters.from) params.set("from", String(filters.from));
      if (filters.to) params.set("to", String(filters.to));
      if (filters.spanName) params.set("spanName", filters.spanName);
      if (filters.latencyMinMs !== undefined) params.set("latencyMin", String(filters.latencyMinMs));
      if (filters.latencyMaxMs !== undefined) params.set("latencyMax", String(filters.latencyMaxMs));
      if (filters.costMinUsd !== undefined) params.set("costMin", String(filters.costMinUsd));
      if (filters.costMaxUsd !== undefined) params.set("costMax", String(filters.costMaxUsd));

      const res = await fetch(`/api/traces?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [offset, filters, pageSize, tick]);

  useEffect(() => { fetchTraces(); }, [fetchTraces]);

  return {
    items,
    total,
    limit: pageSize,
    offset,
    loading,
    error,
    setPage: setOffset,
    setFilters,
    refresh: () => setTick(t => t + 1),
  };
}

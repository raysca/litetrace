import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { DashboardEmpty } from "../components/DashboardEmpty";
import { TimeRangePicker } from "../components/TimeRangePicker";
import { BarChart } from "../components/BarChart";

interface VolumeDay {
  date: string;
  requests: number;
  tokens: number;
  costUsd: number;
  avgLatencyMs: number;
}

interface DashboardStats {
  totalTraces: number;
  totalLlmCalls: number;
  totalCostUsd: number;
  totalTokens: number;
  avgLatencyMs: number;
  byModel: { model: string | null; totalCost: number; totalTokens: number; callCount: number }[];
  volumeByDay: VolumeDay[];
  recentErrors: { name: string; count: number }[];
}

function formatNumber(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

type VolumeMetric = "requests" | "tokens" | "costUsd" | "avgLatencyMs";

const METRIC_CONFIG: Record<VolumeMetric, {
  label: string;
  color: string;
  formatTick: (v: number) => string;
  formatTooltip: (v: number) => string;
}> = {
  requests: {
    label: "Requests",
    color: "#3b82f6",
    formatTick: (v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v),
    formatTooltip: (v) => `${v} requests`,
  },
  tokens: {
    label: "Tokens",
    color: "#8b5cf6",
    formatTick: (v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v),
    formatTooltip: (v) => `${formatNumber(v)} tokens`,
  },
  costUsd: {
    label: "Cost",
    color: "#10b981",
    formatTick: (v) => v === 0 ? "$0" : v < 0.01 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`,
    formatTooltip: (v) => `$${v.toFixed(4)}`,
  },
  avgLatencyMs: {
    label: "Latency",
    color: "#f59e0b",
    formatTick: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${Math.round(v)}ms`,
    formatTooltip: (v) => formatLatency(v),
  },
};

export function Dashboard() {
  const now = Date.now();
  const [from, setFrom] = useState(now - 7 * 24 * 60 * 60 * 1000);
  const [to, setTo] = useState(now);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [volumeMetric, setVolumeMetric] = useState<VolumeMetric>("requests");

  async function load(f = from, t = to) {
    setRefreshing(true);
    try {
      const r = await fetch(`/api/dashboard/stats?from=${f}&to=${t}`);
      const data = await r.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleRangeChange(f: number, t: number) {
    setFrom(f);
    setTo(t);
    load(f, t);
  }

  const totalModelCalls = stats?.byModel.reduce((s, m) => s + m.callCount, 0) ?? 0;

  if (!refreshing && stats && stats.totalTraces === 0) {
    return <DashboardEmpty />;
  }

  const activeModels = stats?.byModel
    .filter(m => m.model)
    .slice(0, 3)
    .map(m => m.model)
    .join(", ");

  const metricCards = stats ? [
    { ordinal: "01", label: "TOTAL REQUESTS", value: formatNumber(stats.totalLlmCalls) },
    { ordinal: "02", label: "TOKENS PROCESSED", value: formatNumber(stats.totalTokens) },
    { ordinal: "03", label: "TOTAL COST", value: `$${stats.totalCostUsd.toFixed(2)}` },
    { ordinal: "04", label: "AVG LATENCY", value: formatLatency(stats.avgLatencyMs) },
  ] : [];

  const mc = METRIC_CONFIG[volumeMetric];
  const chartData = (stats?.volumeByDay ?? []).map(d => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }));

  return (
    <div className="flex flex-col gap-0">
      {/* Page header */}
      <div className="flex items-start justify-between pb-5 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {activeModels ? activeModels : "All models"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TimeRangePicker from={from} to={to} onChange={handleRangeChange} />
          <button
            onClick={() => load()}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-60"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="border-b border-border">
        {stats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
            {metricCards.map(c => (
              <div key={c.label} className="px-6 py-7">
                <p className="text-[10px] text-muted-foreground/50 mb-2 tracking-wider">{c.ordinal}</p>
                <p className="text-3xl font-bold tracking-tight mb-2">{c.value}</p>
                <p className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase">
                  {c.label}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="px-6 py-7">
                <div className="h-3 w-4 bg-muted animate-pulse rounded mb-3" />
                <div className="h-8 w-28 bg-muted animate-pulse rounded mb-3" />
                <div className="h-2.5 w-24 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request Volume chart */}
      <div className="border-b border-border py-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold">Request Volume</h2>
          <div className="flex items-center border border-border rounded overflow-hidden">
            {(Object.keys(METRIC_CONFIG) as VolumeMetric[]).map(id => (
              <button
                key={id}
                onClick={() => setVolumeMetric(id)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  volumeMetric === id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {METRIC_CONFIG[id].label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[160px]">
          {stats ? (
            <BarChart
              data={chartData}
              xKey="label"
              yKey={volumeMetric}
              color={mc.color}
              formatTick={mc.formatTick}
              formatTooltip={mc.formatTooltip}
              height={160}
            />
          ) : (
            <div className="w-full h-full animate-pulse bg-muted rounded" />
          )}
        </div>
      </div>

      {/* Bottom row: Model Breakdown + Recent Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-border pt-0">
        {/* Model Breakdown */}
        <div className="py-6 pr-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold">Model Breakdown</h2>
            <span className="text-xs text-muted-foreground">by request volume</span>
          </div>
          {stats && stats.byModel.length > 0 ? (
            <div className="space-y-3">
              {stats.byModel.map((m, i) => {
                const pct = totalModelCalls > 0 ? (m.callCount / totalModelCalls) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-foreground w-36 truncate shrink-0">
                      {m.model ?? "unknown"}
                    </span>
                    <div className="flex-1 h-1.5 bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-10 text-right shrink-0">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No model data yet.</p>
          )}
        </div>

        {/* Recent Errors */}
        <div className="py-6 pl-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold">Recent Errors</h2>
            {stats && stats.recentErrors.length > 0 && (
              <span className="text-[10px] font-medium bg-status-error-bg text-status-error-text px-2 py-0.5">
                {stats.recentErrors.reduce((s, e) => s + e.count, 0)} errors
              </span>
            )}
          </div>
          {stats && stats.recentErrors.length > 0 ? (
            <div className="space-y-2">
              {stats.recentErrors.map((e, i) => (
                <div key={i} className="flex items-center justify-between gap-2 py-1">
                  <span className="text-xs font-mono text-status-error truncate">{e.name}</span>
                  <span className="text-xs font-medium text-status-error-text bg-status-error-bg px-2 py-0.5 shrink-0">
                    +{e.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No errors — nice work!</p>
          )}
        </div>
      </div>
    </div>
  );
}

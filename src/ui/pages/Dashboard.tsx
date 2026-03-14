import { useEffect, useState } from "react";
import { RefreshCw, Calendar, ChevronDown } from "lucide-react";
import { DashboardEmpty } from "../components/DashboardEmpty";

interface DashboardStats {
  totalTraces: number;
  totalLlmCalls: number;
  totalCostUsd: number;
  totalTokens: number;
  avgLatencyMs: number;
  byModel: { model: string | null; totalCost: number; totalTokens: number; callCount: number }[];
  volumeByDay: { date: string; requests: number }[];
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

type VolumeMetric = "requests" | "tokens" | "cost" | "latency";

function VolumeChart({ data }: { data: { date: string; requests: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No data
      </div>
    );
  }
  const max = Math.max(...data.map(d => d.requests), 1);
  const chartH = 120;
  const barW = 28;
  const gap = 12;
  const totalW = data.length * (barW + gap) - gap;

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH}`} className="w-full" style={{ height: chartH }}>
      {data.map((d, i) => {
        const barH = Math.max(4, (d.requests / max) * (chartH - 20));
        const x = i * (barW + gap);
        const y = chartH - barH - 18;
        return (
          <g key={d.date}>
            <rect x={x} y={y} width={barW} height={barH} rx={0} className="fill-primary" />
            <text
              x={x + barW / 2} y={chartH - 4}
              textAnchor="middle" fontSize={9}
              className="fill-muted-foreground"
            >
              {d.date.slice(5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [volumeMetric, setVolumeMetric] = useState<VolumeMetric>("requests");

  async function load() {
    setRefreshing(true);
    try {
      const r = await fetch("/api/dashboard/stats");
      const data = await r.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

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

  const volumeTabs: { id: VolumeMetric; label: string }[] = [
    { id: "requests", label: "Requests" },
    { id: "tokens", label: "Tokens" },
    { id: "cost", label: "Cost" },
    { id: "latency", label: "Latency" },
  ];

  return (
    <div className="flex flex-col gap-0">
      {/* Page header */}
      <div className="flex items-start justify-between pb-5 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Last 7 days{activeModels ? ` · ${activeModels}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded text-foreground hover:bg-muted transition-colors">
            <Calendar size={12} className="text-muted-foreground" />
            Last 7 days
            <ChevronDown size={12} className="text-muted-foreground" />
          </button>
          <button
            onClick={load}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-60"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat cards — single container with dividers */}
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
            {volumeTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setVolumeMetric(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  volumeMetric === tab.id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[140px] flex items-end">
          {stats ? (
            <VolumeChart data={stats.volumeByDay} />
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

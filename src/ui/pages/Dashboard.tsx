import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";
import { WelcomeScreen } from "../components/WelcomeScreen";
import { RefreshControl } from "../components/RefreshControl";

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

// Simple SVG bar chart — no dependency needed
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
            <rect
              x={x} y={y}
              width={barW} height={barH}
              rx={3}
              className="fill-primary"
            />
            <text
              x={x + barW / 2} y={chartH - 4}
              textAnchor="middle"
              fontSize={9}
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
  const [showWelcome, setShowWelcome] = useState(true);

  async function load() {
    setRefreshing(true);
    try {
      const r = await fetch("/api/dashboard/stats");
      const data = await r.json();
      setStats(data);
      // Hide welcome screen if we have traces
      if (data.totalTraces > 0) {
        setShowWelcome(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const hasTraces = stats && stats.totalTraces > 0;
  const totalModelCalls = stats?.byModel.reduce((s, m) => s + m.callCount, 0) ?? 0;

  const metricCards = stats ? [
    {
      ordinal: "01",
      label: "Total Requests",
      value: formatNumber(stats.totalLlmCalls),
    },
    {
      ordinal: "02",
      label: "Tokens Processed",
      value: formatNumber(stats.totalTokens),
    },
    {
      ordinal: "03",
      label: "Total Cost",
      value: `$${stats.totalCostUsd.toFixed(2)}`,
    },
    {
      ordinal: "04",
      label: "Avg Latency",
      value: formatLatency(stats.avgLatencyMs),
    },
  ] : [];

  // Show welcome screen on first visit or when no traces exist
  if (showWelcome && !hasTraces) {
    return (
      <WelcomeScreen
        onDismiss={() => setShowWelcome(false)}
        hasTraces={!!hasTraces}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Overview</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Last 7 days</p>
        </div>
        <RefreshControl
          onRefresh={load}
          refreshing={refreshing}
          storageKey="litetrace.autoRefresh.dashboard"
        />
      </div>

      {/* Stat cards */}
      {stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metricCards.map(c => (
            <div
              key={c.label}
              className="rounded-lg border bg-card px-5 py-4"
            >
              <p className="text-[10px] font-mono text-muted-foreground/60 mb-1">{c.ordinal}</p>
              <p className="text-xs text-muted-foreground mb-2">{c.label}</p>
              <p className="text-2xl font-bold tracking-tight">{c.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-lg border bg-card px-5 py-4 h-24 animate-pulse bg-muted" />
          ))}
        </div>
      )}

      {/* Request Volume chart */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Request Volume</h2>
          <div className="flex items-center gap-1">
            <button className="px-2.5 py-1 text-xs font-medium rounded bg-foreground text-background">Requests</button>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Model Breakdown */}
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Model Breakdown</h2>
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
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${pct}%` }}
                      />
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
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Recent Errors</h2>
            {stats && stats.recentErrors.length > 0 && (
              <span className="text-[10px] font-medium bg-status-error-bg text-status-error-text px-2 py-0.5 rounded-full">
                {stats.recentErrors.reduce((s, e) => s + e.count, 0)} errors
              </span>
            )}
          </div>
          {stats && stats.recentErrors.length > 0 ? (
            <div className="space-y-2">
              {stats.recentErrors.map((e, i) => (
                <div key={i} className="flex items-center justify-between gap-2 py-1">
                  <span className="text-xs font-mono text-status-error truncate">{e.name}</span>
                  <span className="text-xs font-medium text-status-error-text bg-status-error-bg px-2 py-0.5 rounded-full shrink-0">
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

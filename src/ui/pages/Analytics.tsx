import { useState, useMemo } from "react";
import { Calendar, ChevronDown, Download } from "lucide-react";
import { useAnalytics } from "../hooks/useAnalytics";
import type { AnalyticsData } from "../hooks/useAnalytics";
import { AnalyticsEmpty } from "../components/AnalyticsEmpty";

// ─── Formatters ────────────────────────────────────────────────────────────

function fmtCost(n: number): string {
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.0001) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(6)}`;
}

function fmtMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

// ─── Delta Badge ────────────────────────────────────────────────────────────
// inverted=true → lower value is good (latency)

function DeltaBadge({ value, inverted = false }: { value: number; inverted?: boolean }) {
  if (value === 0 || !isFinite(value)) return null;
  const isGood = inverted ? value < 0 : value < 0;
  const sign = value > 0 ? "+" : "";
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-sm ${isGood ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
      {sign}{value.toFixed(1)}%
    </span>
  );
}

// ─── Cost Over Time (area chart) ─────────────────────────────────────────────

function CostChart({ data }: { data: { date: string; costUsd: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        No cost data in range
      </div>
    );
  }

  const W = 560, H = 120, PAD_X = 8, PAD_TOP = 16, PAD_BOT = 22;
  const plotW = W - PAD_X * 2;
  const plotH = H - PAD_TOP - PAD_BOT;
  const max = Math.max(...data.map(d => d.costUsd), 0.000001);
  const n = data.length;
  const xs = data.map((_, i) => PAD_X + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW));
  const ys = data.map(d => PAD_TOP + (1 - d.costUsd / max) * plotH);

  const lineD = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${(ys[i] ?? 0).toFixed(1)}`).join(" ");
  const lastX = (xs[n - 1] ?? 0).toFixed(1);
  const firstX = (xs[0] ?? 0).toFixed(1);
  const baseY = (PAD_TOP + plotH).toFixed(1);
  const areaD = `${lineD} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;

  // Show at most 10 date labels to avoid overlap
  const labelStep = Math.ceil(n / 10);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: H }}>
      <defs>
        <linearGradient id="costAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#costAreaGrad)" />
      <path d={lineD} fill="none" stroke="#3B82F6" strokeWidth="1.5" />
      {data.map((d, i) => {
        if (i % labelStep !== 0 && i !== n - 1) return null;
        return (
          <text key={d.date} x={xs[i] ?? 0} y={H - 5} textAnchor="middle" fontSize={8} fill="#999">
            {d.date.slice(5)}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Latency Distribution (bar chart) ────────────────────────────────────────

function LatencyChart({ p }: { p: { p50: number; p90: number; p95: number; p99: number } }) {
  const bars = [
    { label: "P50", value: p.p50 },
    { label: "P90", value: p.p90 },
    { label: "P95", value: p.p95 },
    { label: "P99", value: p.p99 },
  ];
  const max = Math.max(...bars.map(b => b.value), 1);
  const W = 320, H = 120, PAD_BOT = 22, PAD_TOP = 18;
  const barW = 44, gap = 28;
  const totalW = bars.length * barW + (bars.length - 1) * gap;
  const startX = (W - totalW) / 2;
  const plotH = H - PAD_TOP - PAD_BOT;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {bars.map((b, i) => {
        const barH = Math.max(4, (b.value / max) * plotH);
        const x = startX + i * (barW + gap);
        const y = PAD_TOP + plotH - barH;
        return (
          <g key={b.label}>
            <rect x={x} y={y} width={barW} height={barH} className="fill-primary/70" />
            <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={9} fill="#555" fontWeight="500">
              {fmtMs(b.value)}
            </text>
            <text x={x + barW / 2} y={H - 5} textAnchor="middle" fontSize={9} fill="#999">
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Date range presets ───────────────────────────────────────────────────────

const PRESETS = [
  { label: "Last 7d", days: 7 },
  { label: "Last 30d", days: 30 },
  { label: "Last 90d", days: 90 },
];

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(byModel: AnalyticsData["byModel"]) {
  const headers = ["Model", "Requests", "Tokens In", "Tokens Out", "Total Cost (USD)", "Share %"];
  const rows = byModel.map(r => [
    r.model,
    r.requests,
    r.promptTokens,
    r.completionTokens,
    r.totalCostUsd.toFixed(6),
    r.sharePct.toFixed(2),
  ]);
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "analytics.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Analytics page ───────────────────────────────────────────────────────────

export function Analytics() {
  const [presetIdx, setPresetIdx] = useState(1);
  const [showPresets, setShowPresets] = useState(false);

  const { from, to } = useMemo(() => {
    const now = Date.now();
    const days = (PRESETS[presetIdx] ?? PRESETS[1]!).days;
    return { from: now - days * 24 * 60 * 60 * 1000, to: now };
  }, [presetIdx]);

  const { data, loading } = useAnalytics(from, to);

  // Show empty state when data loaded with no observations
  if (!loading && data && data.byModel.length === 0) {
    return <AnalyticsEmpty />;
  }

  const s = data?.summary;

  const kpiCards = [
    {
      label: "TOTAL SPEND",
      value: s ? fmtCost(s.totalCostUsd) : null,
      delta: s?.totalCostDelta ?? 0,
      inverted: false,
    },
    {
      label: "AVG LATENCY P95",
      value: s ? fmtMs(s.latencyP95Ms) : null,
      delta: s?.latencyP95DeltaPct ?? 0,
      inverted: true,
    },
    {
      label: "ERROR RATE",
      value: s ? `${s.errorRatePct.toFixed(1)}%` : null,
      delta: s?.errorRateDelta ?? 0,
      inverted: false,
    },
    {
      label: "COST / 1K TOKENS",
      value: s ? fmtCost(s.costPerKTokens) : null,
      delta: s?.costPerKTokensDelta ?? 0,
      inverted: false,
    },
  ];

  return (
    <div className="flex flex-col -mx-8 -mt-6">

      {/* Topbar */}
      <div className="flex items-start justify-between px-8 py-5 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Cost, latency & token analysis · {(PRESETS[presetIdx] ?? PRESETS[1]!).label}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date range dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowPresets(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded text-foreground hover:bg-muted transition-colors"
            >
              <Calendar size={12} className="text-muted-foreground" />
              {(PRESETS[presetIdx] ?? PRESETS[1]!).label}
              <ChevronDown size={12} className="text-muted-foreground" />
            </button>
            {showPresets && (
              <div className="absolute right-0 top-full mt-1 z-10 bg-background border border-border shadow-sm min-w-[120px]">
                {PRESETS.map((p, i) => (
                  <button
                    key={p.label}
                    onClick={() => { setPresetIdx(i); setShowPresets(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${i === presetIdx ? "font-semibold" : ""}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export CSV */}
          <button
            onClick={() => data && exportCSV(data.byModel)}
            disabled={!data || data.byModel.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={12} />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="border-b border-border">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
          {kpiCards.map(c => (
            <div key={c.label} className="px-6 py-5" style={{ minHeight: 88 }}>
              {c.value ? (
                <>
                  <p className="text-[10px] text-muted-foreground/60 mb-2 tracking-widest uppercase">{c.label}</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold tracking-tight">{c.value}</p>
                    <DeltaBadge value={c.delta} inverted={c.inverted} />
                  </div>
                </>
              ) : (
                <>
                  <div className="h-2.5 w-24 bg-muted animate-pulse rounded mb-3" />
                  <div className="h-6 w-20 bg-muted animate-pulse rounded" />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-border border-b">
        <div className="px-8 py-6">
          <h2 className="text-sm font-bold mb-4">Cost Over Time</h2>
          <div style={{ height: 120 }}>
            {data ? (
              <CostChart data={data.costByDay} />
            ) : (
              <div className="w-full h-full animate-pulse bg-muted rounded" />
            )}
          </div>
        </div>
        <div className="px-8 py-6">
          <h2 className="text-sm font-bold mb-4">Latency Distribution</h2>
          <div style={{ height: 120 }}>
            {data ? (
              <LatencyChart p={data.latencyPercentiles} />
            ) : (
              <div className="w-full h-full animate-pulse bg-muted rounded" />
            )}
          </div>
        </div>
      </div>

      {/* Model cost table */}
      <div className="px-8 py-6">
        <h2 className="text-sm font-bold mb-4">Model Cost Breakdown</h2>
        {data && data.byModel.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["MODEL", "REQUESTS", "TOKENS IN", "TOKENS OUT", "TOTAL COST", "SHARE"].map(h => (
                  <th key={h} className="pb-2.5 text-left text-[10px] font-medium text-muted-foreground tracking-widest pr-6 last:pr-0">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.byModel.map((row, i) => (
                <tr key={i} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                  <td className="py-3 pr-6 font-mono text-xs text-foreground">{row.model}</td>
                  <td className="py-3 pr-6 text-xs text-muted-foreground">{row.requests.toLocaleString()}</td>
                  <td className="py-3 pr-6 text-xs text-muted-foreground">{row.promptTokens.toLocaleString()}</td>
                  <td className="py-3 pr-6 text-xs text-muted-foreground">{row.completionTokens.toLocaleString()}</td>
                  <td className="py-3 pr-6 text-xs font-medium">{fmtCost(row.totalCostUsd)}</td>
                  <td className="py-3 w-44">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted overflow-hidden rounded-sm">
                        <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, row.sharePct)}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-10 text-right shrink-0">
                        {row.sharePct.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No model data in this period.</p>
        )}
      </div>
    </div>
  );
}

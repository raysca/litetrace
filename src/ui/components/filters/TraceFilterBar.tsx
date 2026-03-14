import { useState, useEffect } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";

interface Filters {
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

interface TraceFilterBarProps {
  onFilter: (filters: Filters) => void;
  onRefresh: () => void;
}

const DATE_PRESETS = [
  { label: "All",      from: () => undefined,                          to: () => undefined },
  { label: "Last 1h",  from: () => Date.now() - 3_600_000,            to: () => Date.now() },
  { label: "Last 24h", from: () => Date.now() - 86_400_000,           to: () => Date.now() },
  { label: "Last 7d",  from: () => Date.now() - 7 * 86_400_000,       to: () => Date.now() },
  { label: "Last 30d", from: () => Date.now() - 30 * 86_400_000,      to: () => Date.now() },
];

const LATENCY_PRESETS = [
  { label: "< 100ms",    minMs: undefined, maxMs: 100 },
  { label: "100-500ms",  minMs: 100,       maxMs: 500 },
  { label: "> 1s",       minMs: 1000,      maxMs: undefined },
];

const COST_PRESETS = [
  { label: "< $0.01",  minUsd: undefined, maxUsd: 0.01 },
  { label: "> $0.10",  minUsd: 0.10,      maxUsd: undefined },
];

// Shared style for Row 1 labelled select/input boxes
const fieldCls = "h-8 border border-input bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring min-w-[120px]";

export function TraceFilterBar({ onFilter, onRefresh }: TraceFilterBarProps) {
  const [services, setServices] = useState<string[]>([]);
  const [service, setService]         = useState("");
  const [status, setStatus]           = useState("");
  const [dateLabel, setDateLabel]     = useState("Last 24h");
  const [spanName, setSpanName]       = useState("");
  const [latencyMin, setLatencyMin]   = useState<number | undefined>();
  const [latencyMax, setLatencyMax]   = useState<number | undefined>();
  const [costMin, setCostMin]         = useState<number | undefined>();
  const [costMax, setCostMax]         = useState<number | undefined>();
  const [showAdvanced, setShowAdvanced] = useState(true);

  useEffect(() => {
    fetch("/api/services")
      .then(r => r.json())
      .then(data => setServices(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const hasActive = !!(service || status || dateLabel !== "Last 24h" || spanName ||
    latencyMin !== undefined || latencyMax !== undefined ||
    costMin !== undefined || costMax !== undefined);

  function buildFilters(): Filters {
    const preset = DATE_PRESETS.find(p => p.label === dateLabel) ?? DATE_PRESETS[2]!;
    return {
      service: service || undefined,
      status: status || undefined,
      from: preset.from(),
      to: preset.to(),
      spanName: spanName || undefined,
      latencyMinMs: latencyMin,
      latencyMaxMs: latencyMax,
      costMinUsd: costMin,
      costMaxUsd: costMax,
    };
  }

  function handleApply() {
    onFilter(buildFilters());
  }

  function handleClear() {
    setService("");
    setStatus("");
    setDateLabel("Last 24h");
    setSpanName("");
    setLatencyMin(undefined);
    setLatencyMax(undefined);
    setCostMin(undefined);
    setCostMax(undefined);
    onFilter({});
  }

  function isLatencyActive(p: typeof LATENCY_PRESETS[number]) {
    return latencyMin === p.minMs && latencyMax === p.maxMs;
  }

  function isCostActive(p: typeof COST_PRESETS[number]) {
    return costMin === p.minUsd && costMax === p.maxUsd;
  }

  return (
    <div className="border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="text-sm font-semibold">Filters</span>
        <span className="text-xs text-muted-foreground">
          {hasActive ? "Filters active" : "No active filters"}
        </span>
      </div>

      {/* Row 1: Basic filters */}
      <div className="flex items-center gap-x-4 px-4 py-2.5 border-b border-border flex-wrap gap-y-2">
        {/* Service */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Service:</span>
          <select
            value={service}
            onChange={e => setService(e.target.value)}
            className={fieldCls}
          >
            <option value="">All</option>
            {services.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Status:</span>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className={fieldCls}
          >
            <option value="">All</option>
            <option value="ok">ok</option>
            <option value="error">error</option>
            <option value="unset">unset</option>
          </select>
        </div>

        {/* Date */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Date:</span>
          <select
            value={dateLabel}
            onChange={e => setDateLabel(e.target.value)}
            className={fieldCls}
          >
            {DATE_PRESETS.map(p => (
              <option key={p.label} value={p.label}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* More toggle */}
        <button
          onClick={() => setShowAdvanced(v => !v)}
          className="flex items-center gap-1 h-8 px-3 text-xs border border-border text-foreground hover:bg-muted transition-colors"
        >
          More
          <ChevronDown
            size={12}
            className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`}
          />
        </button>

        {/* Apply */}
        <button
          onClick={handleApply}
          className="h-8 px-4 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          Apply
        </button>

        {/* Reset */}
        <button
          onClick={handleClear}
          className="flex items-center justify-center h-8 w-8 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Clear filters"
        >
          <RotateCcw size={12} />
        </button>
      </div>

      {/* Row 2: Advanced filters */}
      {showAdvanced && (
        <div className="flex items-center gap-x-5 px-4 py-2.5 flex-wrap gap-y-2">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
            Advanced Filters:
          </span>

          {/* Latency */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Latency:</span>
            <div className="flex gap-1">
              {LATENCY_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => {
                    if (isLatencyActive(p)) {
                      setLatencyMin(undefined);
                      setLatencyMax(undefined);
                    } else {
                      setLatencyMin(p.minMs);
                      setLatencyMax(p.maxMs);
                    }
                  }}
                  className={`h-7 px-2.5 text-xs font-medium border transition-colors ${
                    isLatencyActive(p)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Span name */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Span:</span>
            <input
              type="text"
              placeholder="All"
              value={spanName}
              onChange={e => setSpanName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleApply()}
              className="h-7 border border-input bg-background px-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-28"
            />
          </div>

          {/* Cost */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Cost:</span>
            <div className="flex gap-1">
              {COST_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => {
                    if (isCostActive(p)) {
                      setCostMin(undefined);
                      setCostMax(undefined);
                    } else {
                      setCostMin(p.minUsd);
                      setCostMax(p.maxUsd);
                    }
                  }}
                  className={`h-7 px-2.5 text-xs font-medium border transition-colors ${
                    isCostActive(p)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

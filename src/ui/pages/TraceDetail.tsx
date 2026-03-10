import { useState } from "react";
import { useTrace } from "../hooks/useTrace";
import { SpanTree } from "../components/SpanTree";
import { SpanTimeline } from "../components/SpanTimeline";
import { ObservationPanel } from "../components/ObservationPanel";
import { StatusBadge } from "../components/StatusBadge";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

type Tab = "tree" | "timeline" | "llm";

function formatLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

function formatTimestamp(unixMicros: number): string {
  return new Date(unixMicros / 1000).toISOString().replace("T", " · ").replace(/\.\d{3}Z$/, " UTC");
}

function truncateId(id: string): string {
  return id.length > 20 ? `trc_${id.slice(0, 16)}…` : id;
}

export function TraceDetail() {
  const { traceId } = useParams({ from: "/traces/$traceId" });
  const navigate = useNavigate({ from: "/traces/$traceId" });
  const { data, loading, error } = useTrace(traceId);
  const [tab, setTab] = useState<Tab>("tree");
  const [expandAll, setExpandAll] = useState(false);
  const [expandKey, setExpandKey] = useState(0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        Loading trace…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-status-error-text bg-status-error-bg border border-status-error/20 rounded-md px-3 py-2">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const { trace, spans, observations } = data;

  // Aggregate metrics from observations
  const totalTokens = observations.reduce((s, o) => s + (o.totalTokens ?? 0), 0);
  const totalCost = observations.reduce((s, o) => s + (o.costUsd ?? 0), 0);
  const primaryModel = observations[0]?.model ?? null;

  const metrics = [
    { label: "STATUS",        value: <StatusBadge status={trace.status} /> },
    { label: "MODEL",         value: primaryModel ?? "—" },
    { label: "TOTAL TOKENS",  value: totalTokens > 0 ? totalTokens.toLocaleString() : "—" },
    { label: "COST",          value: totalCost > 0 ? `$${totalCost.toFixed(4)}` : "—" },
    { label: "LATENCY",       value: formatLatency(trace.durationMs) },
    { label: "TIMESTAMP",     value: formatTimestamp(trace.startTime) },
  ];

  function handleExpandAll() {
    setExpandAll(true);
    setExpandKey(k => k + 1);
  }

  return (
    <div className="flex flex-col gap-0 -mx-8 -mt-6">
      {/* Breadcrumb header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b">
        <div className="flex items-center gap-1.5 text-sm">
          <button
            onClick={() => navigate({ to: "/traces" })}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Traces
          </button>
          <ChevronRight size={14} className="text-muted-foreground/50" />
          <span className="font-mono text-xs text-foreground">{truncateId(traceId)}</span>
        </div>
      </div>

      {/* Metrics bar */}
      <div className="flex items-center gap-8 px-6 py-4 border-b bg-muted/20">
        {metrics.map(m => (
          <div key={m.label} className="flex flex-col gap-1 min-w-0">
            <span className="text-[10px] font-medium tracking-wider text-muted-foreground">{m.label}</span>
            <span className="text-sm font-medium">{m.value}</span>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex items-center px-6 border-b">
        <div className="flex items-center gap-1 -mb-px">
          {([
            { id: "tree",     label: "Tree View" },
            { id: "timeline", label: "Timeline" },
            { id: "llm",      label: "LLM" },
          ] as { id: Tab; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={cn(
                "px-3 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5",
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              {t.id === "llm" && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full tabular-nums",
                  tab === "llm"
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                )}>
                  {observations.length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3 py-2">
          <span className="text-xs text-muted-foreground">
            {spans.length} span{spans.length !== 1 ? "s" : ""}
          </span>
          {tab === "tree" && (
            <button
              onClick={handleExpandAll}
              className="text-xs text-primary hover:underline"
            >
              Expand All
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pt-4">
        {tab === "tree" && (
          <SpanTree
            spans={spans}
            observations={observations}
            expandAll={expandAll}
            expandKey={expandKey}
            onCollapseAll={() => setExpandAll(false)}
          />
        )}
        {tab === "timeline" && (
          <SpanTimeline
            spans={spans}
            traceStartTime={trace.startTime}
            traceEndTime={trace.endTime}
          />
        )}
        {tab === "llm" && (
          <ObservationPanel observations={observations} />
        )}
      </div>
    </div>
  );
}

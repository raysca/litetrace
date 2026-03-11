import { useState } from "react";
import { useTrace } from "../hooks/useTrace";
import { SpanTree } from "../components/SpanTree";
import { SpanTimeline } from "../components/SpanTimeline";
import { ObservationPanel } from "../components/ObservationPanel";
import { StatusBadge } from "../components/StatusBadge";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ChevronRight, ListTree, Timer } from "lucide-react";
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
      <div className="text-sm text-[#C41E3A] bg-[#FFF8F8] border border-[#C41E3A]/20 px-3 py-2">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const { trace, spans, observations } = data;

  const totalTokens = observations.reduce((s, o) => s + (o.totalTokens ?? 0), 0);
  const totalCost   = observations.reduce((s, o) => s + (o.costUsd   ?? 0), 0);
  const primaryModel = observations[0]?.model ?? null;

  function handleExpandAll() {
    setExpandAll(true);
    setExpandKey(k => k + 1);
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "tree",     label: "Tree View", icon: ListTree },
    { id: "timeline", label: "Timeline",  icon: Timer },
  ];

  return (
    <div className="flex flex-col gap-0 -mx-8 -mt-6">

      {/* ── Breadcrumb header ─────────────────────────────── */}
      <div className="flex items-center justify-between px-6 border-b" style={{ height: 56 }}>
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

      {/* ── Trace meta strip ──────────────────────────────── */}
      <div className="flex items-center border-b" style={{ height: 80 }}>
        {/* STATUS */}
        <div className="flex flex-col gap-1 px-8 border-r h-full justify-center" style={{ minWidth: 160 }}>
          <span className="text-[10px] font-semibold tracking-[1.5px] text-[#999999]">STATUS</span>
          <StatusBadge status={trace.status} />
        </div>
        {/* MODEL */}
        <div className="flex flex-col gap-1 px-8 border-r h-full justify-center" style={{ minWidth: 160 }}>
          <span className="text-[10px] font-semibold tracking-[1.5px] text-[#999999]">MODEL</span>
          <span className="text-[13px] font-medium text-[#111111]">{primaryModel ?? "—"}</span>
        </div>
        {/* TOTAL TOKENS */}
        <div className="flex flex-col gap-1 px-8 border-r h-full justify-center" style={{ minWidth: 140 }}>
          <span className="text-[10px] font-semibold tracking-[1.5px] text-[#999999]">TOTAL TOKENS</span>
          <span className="text-[18px] font-medium text-[#111111] leading-tight tabular-nums">
            {totalTokens > 0 ? totalTokens.toLocaleString() : "—"}
          </span>
        </div>
        {/* COST */}
        <div className="flex flex-col gap-1 px-8 border-r h-full justify-center" style={{ minWidth: 120 }}>
          <span className="text-[10px] font-semibold tracking-[1.5px] text-[#999999]">COST</span>
          <span className="text-[18px] font-medium text-[#111111] leading-tight tabular-nums">
            {totalCost > 0 ? `$${totalCost.toFixed(4)}` : "—"}
          </span>
        </div>
        {/* LATENCY */}
        <div className="flex flex-col gap-1 px-8 border-r h-full justify-center" style={{ minWidth: 120 }}>
          <span className="text-[10px] font-semibold tracking-[1.5px] text-[#999999]">LATENCY</span>
          <span className="text-[18px] font-medium text-[#111111] leading-tight tabular-nums">
            {formatLatency(trace.durationMs)}
          </span>
        </div>
        {/* TIMESTAMP */}
        <div className="flex flex-col gap-1 px-8 h-full justify-center flex-1">
          <span className="text-[10px] font-semibold tracking-[1.5px] text-[#999999]">TIMESTAMP</span>
          <span className="text-[13px] text-[#555555]">{formatTimestamp(trace.startTime)}</span>
        </div>
      </div>

      {/* ── View toggle bar ───────────────────────────────── */}
      <div
        className="flex items-center justify-between px-8 bg-[#F8F8F8] border-b"
        style={{ height: 48 }}
      >
        {/* Tab toggles */}
        <div className="flex items-center">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 h-8 text-[11px] font-semibold transition-colors",
                  active
                    ? "bg-[#111111] text-white"
                    : "text-[#999999] border border-[#CCCCCC] hover:text-foreground hover:border-[#999999]"
                )}
              >
                <Icon size={13} />
                {t.label}
              </button>
            );
          })}
          {/* LLM tab with count */}
          {observations.length > 0 && (
            <button
              onClick={() => setTab("llm")}
              className={cn(
                "flex items-center gap-1.5 px-4 h-8 text-[11px] font-semibold transition-colors",
                tab === "llm"
                  ? "bg-[#111111] text-white"
                  : "text-[#999999] border border-[#CCCCCC] hover:text-foreground hover:border-[#999999]"
              )}
            >
              LLM
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 tabular-nums",
                tab === "llm" ? "bg-white/20 text-white" : "bg-[#0066CC12] text-[#0066CC]"
              )}>
                {observations.length}
              </span>
            </button>
          )}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#999999]">
            {spans.length} span{spans.length !== 1 ? "s" : ""}
          </span>
          {tab === "tree" && (
            <button
              onClick={handleExpandAll}
              className="flex items-center h-7 px-3 text-[11px] text-[#555555] border border-[#E5E5E5] hover:border-[#999999] transition-colors"
            >
              Expand All
            </button>
          )}
        </div>
      </div>

      {/* ── Content area ──────────────────────────────────── */}
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
        <div className="px-6 pt-4">
          <SpanTimeline
            spans={spans}
            traceStartTime={trace.startTime}
            traceEndTime={trace.endTime}
          />
        </div>
      )}
      {tab === "llm" && (
        <div className="px-6 pt-4">
          <ObservationPanel observations={observations} />
        </div>
      )}
    </div>
  );
}

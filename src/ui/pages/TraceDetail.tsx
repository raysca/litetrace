import { useState } from "react";
import { useTrace } from "../hooks/useTrace";
import { SpanTree } from "../components/SpanTree";
import { SpanTimeline } from "../components/SpanTimeline";
import { ObservationPanel } from "../components/ObservationPanel";
import { StatusBadge } from "../components/StatusBadge";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ChevronRight, ChevronLeft, ListTree, Timer, Copy, Cpu } from "lucide-react";
import { cn } from "../../lib/utils";

type Tab = "tree" | "timeline" | "llm";

const LORA: React.CSSProperties = { fontFamily: "'Lora', Georgia, serif" };

function formatLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

function formatTimestamp(unixMicros: number): string {
  return new Date(unixMicros / 1000)
    .toISOString()
    .replace("T", " · ")
    .replace(/\.\d{3}Z$/, " UTC");
}

function truncateId(id: string): string {
  return id.length > 20 ? `trc_${id.slice(0, 16)}…` : id;
}

function MetaCell({
  label,
  children,
  divider = true,
  width,
  className,
}: {
  label: string;
  children: React.ReactNode;
  divider?: boolean;
  width?: number | string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-center gap-1 h-full",
        divider && "border-r border-[#E5E5E5]",
        className
      )}
      style={width ? { width, minWidth: width } : undefined}
    >
      <span className="text-[10px] uppercase text-[#999999] tracking-[1.5px] font-semibold leading-none">
        {label}
      </span>
      <div className="flex items-center">
        {children}
      </div>
    </div>
  );
}

// ─── TraceDetail ─────────────────────────────────────────────────────────────

export function TraceDetail() {
  const { traceId } = useParams({ from: "/traces/$traceId" });
  const navigate = useNavigate({ from: "/traces/$traceId" });
  const { data, loading, error } = useTrace(traceId);

  const [tab, setTab] = useState<Tab>("tree");
  const [expandAll, setExpandAll] = useState(false);
  const [expandKey, setExpandKey] = useState(0);
  const [copied, setCopied] = useState(false);

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
  const totalCost = observations.reduce((s, o) => s + (o.costUsd ?? 0), 0);
  const primaryModel = observations[0]?.model ?? null;

  function handleExpandAll() {
    setExpandAll(true);
    setExpandKey(k => k + 1);
  }

  function handleCopyId() {
    navigator.clipboard.writeText(traceId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  // Build the flat tab list — LLM tab only when there are observations
  const tabs: { id: Tab; label: string; icon: React.ElementType | null; badge?: number }[] = [
    { id: "tree", label: "Tree View", icon: ListTree },
    { id: "timeline", label: "Timeline", icon: Timer },
    ...(observations.length > 0
      ? [{ id: "llm" as Tab, label: "LLM", icon: Cpu, badge: observations.length }]
      : []),
  ];

  return (
    <div className="flex flex-col -mx-8 -mt-6">

      {/* ── Top bar: breadcrumb + Copy ID ─────────────────── */}
      <div
        className="flex items-center justify-between px-6 border-b bg-white"
        style={{ height: 56 }}
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[13px]">
          <button
            onClick={() => navigate({ to: "/traces" })}
            className="text-[#999999] hover:text-[#111111] transition-colors"
          >
            Traces
          </button>
          <ChevronRight size={13} className="text-[#CCCCCC]" />
          <span className="font-mono text-[12px] text-[#111111]">
            {truncateId(traceId)}
          </span>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <button className="flex items-center justify-center w-7 h-7 text-[#555555] border border-[#E5E5E5] hover:border-[#999999] transition-colors bg-white">
              <ChevronLeft size={13} />
            </button>
            <button className="flex items-center justify-center w-7 h-7 text-[#555555] border border-[#E5E5E5] hover:border-[#999999] transition-colors bg-white -ml-px">
              <ChevronRight size={13} />
            </button>
          </div>
          <button
            onClick={handleCopyId}
            className="flex items-center gap-1.5 h-7 px-3 text-[11px] text-[#555555] border border-[#E5E5E5] hover:border-[#999999] transition-colors bg-white"
          >
            <Copy size={11} />
            {copied ? "Copied!" : "Copy ID"}
          </button>
        </div>
      </div>

      {/* ── Meta strip ────────────────────────────────────── */}
      <div className="flex items-center border-b bg-white" style={{ height: 80, paddingLeft: 32, paddingRight: 32 }}>

        <MetaCell label="Status" width={180} className="pr-8">
          <StatusBadge status={trace.status} />
        </MetaCell>

        <MetaCell label="Model" width={180} className="px-8">
          <span className="text-[13px] font-medium text-[#111111] truncate">
            {primaryModel ?? "—"}
          </span>
        </MetaCell>

        <MetaCell label="Total Tokens" width={160} className="px-8">
          <span
            className="text-[18px] font-medium text-[#111111] leading-none tabular-nums"
            style={LORA}
          >
            {totalTokens > 0 ? totalTokens.toLocaleString() : "—"}
          </span>
        </MetaCell>

        <MetaCell label="Cost" width={140} className="px-8">
          <span
            className="text-[18px] font-medium text-[#111111] leading-none tabular-nums"
            style={LORA}
          >
            {totalCost > 0 ? `$${totalCost.toFixed(4)}` : "—"}
          </span>
        </MetaCell>

        <MetaCell label="Latency" width={140} className="px-8">
          <span
            className="text-[18px] font-medium text-[#111111] leading-none tabular-nums"
            style={LORA}
          >
            {formatLatency(trace.durationMs)}
          </span>
        </MetaCell>

        <MetaCell label="Timestamp" divider={false} className="pl-8 !w-auto flex-1">
          <span className="text-[13px] font-normal text-[#555555] whitespace-nowrap">
            {formatTimestamp(trace.startTime)}
          </span>
        </MetaCell>

      </div>

      {/* ── View toggle bar ───────────────────────────────── */}
      <div
        className="flex items-center justify-between px-8 bg-[#F8F8F8] border-b"
        style={{ height: 48 }}
      >
        {/* Flush button group */}
        <div className="flex items-center gap-2">
          {tabs.map((t, i) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 h-[34px] text-[11px] font-semibold transition-colors whitespace-nowrap",
                  active
                    ? "bg-[#111111] text-white border border-transparent"
                    : "text-[#999999] border border-[#CCCCCC] font-normal hover:text-[#555555] hover:border-[#999999]"
                )}
              >
                {Icon && <Icon size={13} className={active ? "text-white" : "text-[#999999]"} />}
                {t.label}
                {t.badge != null && (
                  <span className={cn(
                    "ml-0.5 px-1.5 py-px text-[10px] tabular-nums font-medium",
                    active
                      ? "bg-white/20 text-white"
                      : "bg-[#0066CC12] text-[#0066CC]"
                  )}>
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
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

      {/* ── Content ───────────────────────────────────────── */}
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
          observations={observations}
          traceStartTime={trace.startTime}
          traceEndTime={trace.endTime}
        />
      )}
      {tab === "llm" && (
        <div className="px-6 pt-4">
          <ObservationPanel observations={observations} />
        </div>
      )}

    </div>
  );
}

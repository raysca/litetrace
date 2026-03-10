import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useTraces } from "../hooks/useTraces";
import { StatusBadge } from "../components/StatusBadge";
import { RefreshControl } from "../components/RefreshControl";
import { TraceFilterBar } from "../components/filters/TraceFilterBar";
import { cn } from "../../lib/utils";

const PAGE_SIZE = 20;

function formatTime(unixMicros: number): string {
  return new Date(unixMicros / 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

function formatTokens(raw: string | null): string {
  if (!raw) return "—";
  const n = parseFloat(raw);
  if (isNaN(n) || n === 0) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCost(raw: string | null): string {
  if (!raw) return "—";
  const n = parseFloat(raw);
  if (isNaN(n) || n === 0) return "—";
  return `$${n.toFixed(4)}`;
}

function truncateId(id: string): string {
  return id.length > 16 ? `${id.slice(0, 16)}…` : id;
}

function PaginationButton({
  children,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "min-w-[28px] h-7 px-2 text-xs rounded flex items-center justify-center transition-colors",
        active
          ? "bg-primary text-primary-foreground font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "opacity-40 pointer-events-none"
      )}
    >
      {children}
    </button>
  );
}

export function TraceList() {
  const navigate = useNavigate({ from: "/traces" });
  const [search, setSearch] = useState("");

  const { items, total, limit, offset, loading, error, setPage, setFilters, refresh } =
    useTraces(PAGE_SIZE);
  const refreshing = loading;

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;

  // Page numbers to render: show first, last, current ±1
  function pageNumbers(): (number | "…")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const nums = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1].filter(n => n >= 1 && n <= totalPages));
    const sorted = Array.from(nums).sort((a, b) => a - b);
    const result: (number | "…")[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) result.push("…");
      result.push(sorted[i]!);
    }
    return result;
  }

  // Filter by search (client-side on trace id / root span name / service / model)
  const visible = search.trim()
    ? items.filter(t =>
        t.id.includes(search) ||
        t.rootSpanName.toLowerCase().includes(search.toLowerCase()) ||
        t.serviceName.toLowerCase().includes(search.toLowerCase()) ||
        (t.model ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Traces</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total > 0 ? `${total.toLocaleString()} traces` : "No traces yet"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshControl
            onRefresh={refresh}
            refreshing={refreshing}
            storageKey="litetrace.autoRefresh.traces"
          />
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search traces…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 w-52 rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Trace Filter Bar */}
      <TraceFilterBar onFilter={setFilters} onRefresh={refresh} />

      {error && (
        <div className="text-sm text-status-error-text bg-status-error-bg border border-status-error/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              {["TRACE ID", "MODEL", "STATUS", "TOKENS", "COST", "LATENCY", "TIME"].map(h => (
                <th key={h} className="text-left py-2.5 px-3 text-[11px] font-medium tracking-wide text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && visible.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  {total === 0
                    ? <>No traces yet. Send traces to <code className="bg-muted px-1 rounded text-xs">localhost:4318/v1/traces</code></>
                    : "No traces match your filter."}
                </td>
              </tr>
            )}
            {!loading && visible.map(trace => (
              <tr
                key={trace.id}
                className="border-t cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => navigate({ to: "/traces/$traceId", params: { traceId: trace.id } })}
              >
                {/* Trace ID */}
                <td className="py-2.5 px-3">
                  <span className="font-mono text-xs text-primary">{truncateId(trace.id)}</span>
                </td>
                {/* Model */}
                <td className="py-2.5 px-3 text-xs text-foreground">
                  {trace.model ?? <span className="text-muted-foreground">—</span>}
                </td>
                {/* Status */}
                <td className="py-2.5 px-3">
                  <StatusBadge status={trace.status} />
                </td>
                {/* Tokens */}
                <td className="py-2.5 px-3 text-xs tabular-nums text-foreground">
                  {formatTokens(trace.totalTokens)}
                </td>
                {/* Cost */}
                <td className="py-2.5 px-3 text-xs tabular-nums text-foreground">
                  {formatCost(trace.totalCost)}
                </td>
                {/* Latency */}
                <td className={cn(
                  "py-2.5 px-3 text-xs tabular-nums",
                  trace.status === "error" ? "text-status-error" : "text-foreground"
                )}>
                  {formatLatency(trace.durationMs)}
                </td>
                {/* Time */}
                <td className="py-2.5 px-3 text-xs text-muted-foreground tabular-nums">
                  {formatTime(trace.startTime)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {Math.min(offset + 1, total)}–{Math.min(offset + limit, total)} of{" "}
          {total.toLocaleString()} traces
        </span>
        <div className="flex items-center gap-1">
          <PaginationButton
            disabled={currentPage <= 1}
            onClick={() => setPage(offset - limit)}
          >
            <ChevronLeft size={12} />
            Prev
          </PaginationButton>

          {pageNumbers().map((p, i) =>
            p === "…" ? (
              <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground">…</span>
            ) : (
              <PaginationButton
                key={p}
                active={p === currentPage}
                onClick={() => setPage((p - 1) * limit)}
              >
                {p}
              </PaginationButton>
            )
          )}

          <PaginationButton
            disabled={offset + limit >= total}
            onClick={() => setPage(offset + limit)}
          >
            Next
            <ChevronRight size={12} />
          </PaginationButton>
        </div>
      </div>
    </div>
  );
}

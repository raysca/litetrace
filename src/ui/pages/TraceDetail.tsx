import { useState } from "react";
import { useTrace } from "../hooks/useTrace";
import { SpanTree } from "../components/SpanTree";
import { SpanTimeline } from "../components/SpanTimeline";
import { StatusBadge } from "../components/StatusBadge";
import { Button } from "../../components/ui/button";
import { useNavigate, useParams } from "@tanstack/react-router";

type Tab = "tree" | "timeline";

export function TraceDetail() {
  const { traceId } = useParams({ from: "/traces/$traceId" });
  const navigate = useNavigate({ from: "/traces/$traceId" });
  const { data, loading, error } = useTrace(traceId);
  const [tab, setTab] = useState<Tab>("tree");

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading trace...</div>;
  }

  if (error) {
    return (
      <div className="text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
        Error: {error}
      </div>
    );
  }

  if (!data) return null;

  const { trace, spans } = data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/traces" })}>← Back</Button>
        <h1 className="text-lg font-semibold flex-1 truncate">{trace.rootSpanName}</h1>
        <StatusBadge status={trace.status} />
      </div>

      <div className="grid grid-cols-4 gap-3 text-sm">
        <div className="rounded border p-3">
          <div className="text-muted-foreground text-xs mb-1">Service</div>
          <div className="font-medium">{trace.serviceName}</div>
        </div>
        <div className="rounded border p-3">
          <div className="text-muted-foreground text-xs mb-1">Duration</div>
          <div className="font-medium">{trace.durationMs.toFixed(2)} ms</div>
        </div>
        <div className="rounded border p-3">
          <div className="text-muted-foreground text-xs mb-1">Spans</div>
          <div className="font-medium">{trace.spanCount}</div>
        </div>
        <div className="rounded border p-3">
          <div className="text-muted-foreground text-xs mb-1">Trace ID</div>
          <div className="font-mono text-xs truncate">{trace.id}</div>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        {(["tree", "timeline"] as Tab[]).map(t => (
          <button
            key={t}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab(t)}
          >
            {t === "tree" ? "Span Tree" : "Timeline"}
          </button>
        ))}
      </div>

      <div>
        {tab === "tree" && <SpanTree spans={spans} />}
        {tab === "timeline" && (
          <SpanTimeline
            spans={spans}
            traceStartTime={trace.startTime}
            traceEndTime={trace.endTime}
          />
        )}
      </div>
    </div>
  );
}

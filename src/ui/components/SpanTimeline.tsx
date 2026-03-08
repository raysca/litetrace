import type { SpanRow } from "../hooks/useTrace";
import { StatusBadge } from "./StatusBadge";

interface SpanTimelineProps {
  spans: SpanRow[];
  traceStartTime: number;
  traceEndTime: number;
}

const KIND_LABELS: Record<number, string> = {
  0: "INTERNAL", 1: "SERVER", 2: "CLIENT", 3: "PRODUCER", 4: "CONSUMER"
};

export function SpanTimeline({ spans, traceStartTime, traceEndTime }: SpanTimelineProps) {
  const totalDuration = traceEndTime - traceStartTime;
  if (totalDuration === 0) return <p className="text-muted-foreground text-sm">No timeline data</p>;

  const sorted = [...spans].sort((a, b) => a.startTime - b.startTime);

  return (
    <div className="overflow-auto">
      <div className="min-w-[600px]">
        {/* Time ruler */}
        <div className="flex text-xs text-muted-foreground mb-2 pl-48">
          {[0, 25, 50, 75, 100].map(pct => (
            <div key={pct} className="flex-1 text-center">
              {((totalDuration * pct) / 100 / 1000).toFixed(1)}ms
            </div>
          ))}
        </div>

        {sorted.map(span => {
          const left = ((span.startTime - traceStartTime) / totalDuration) * 100;
          const width = Math.max(((span.endTime - span.startTime) / totalDuration) * 100, 0.5);

          const barColor = span.statusCode === "error"
            ? "bg-red-500"
            : span.statusCode === "ok"
              ? "bg-green-500"
              : "bg-blue-500";

          return (
            <div key={span.id} className="flex items-center gap-2 mb-1 group">
              <div className="w-48 shrink-0 text-xs truncate text-right pr-2 text-muted-foreground group-hover:text-foreground transition-colors">
                {span.name}
              </div>
              <div className="flex-1 h-5 relative bg-muted/30 rounded-sm">
                <div
                  className={`absolute h-full rounded-sm ${barColor} opacity-80`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={`${span.name}\n${span.durationMs.toFixed(2)}ms\n${KIND_LABELS[span.kind] ?? "INTERNAL"}`}
                />
              </div>
              <div className="w-20 shrink-0 text-xs text-muted-foreground text-right">
                {span.durationMs.toFixed(1)}ms
              </div>
              <StatusBadge status={span.statusCode} className="shrink-0" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

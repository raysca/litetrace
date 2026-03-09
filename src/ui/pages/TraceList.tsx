import { useTraces } from "../hooks/useTraces";
import { StatusBadge } from "../components/StatusBadge";
import { TraceFilters } from "../components/TraceFilters";
import { Button } from "../../components/ui/button";
import { useNavigate } from "@tanstack/react-router";

function formatTime(unixMicros: number): string {
  return new Date(unixMicros / 1000).toLocaleString();
}

export function TraceList() {
  const navigate = useNavigate({ from: "/traces" });
  const { items, total, limit, offset, loading, error, setPage, setFilters, refresh } = useTraces(50);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Traces</h1>
        <TraceFilters onFilter={setFilters} onRefresh={refresh} />
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
          Error: {error}
        </div>
      )}

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-xs text-muted-foreground">
              <th className="text-left py-2 px-3 font-medium">Service</th>
              <th className="text-left py-2 px-3 font-medium">Root Span</th>
              <th className="text-left py-2 px-3 font-medium">Duration</th>
              <th className="text-left py-2 px-3 font-medium">Status</th>
              <th className="text-left py-2 px-3 font-medium">Spans</th>
              <th className="text-left py-2 px-3 font-medium">Start Time</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">Loading...</td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  No traces yet. Send traces to <code className="bg-muted px-1 rounded">http://localhost:4318/v1/traces</code>
                </td>
              </tr>
            )}
            {items.map(trace => (
              <tr
                key={trace.id}
                className="border-t cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => navigate({ to: "/traces/$traceId", params: { traceId: trace.id } })}
              >
                <td className="py-2 px-3 font-medium">{trace.serviceName}</td>
                <td className="py-2 px-3 font-mono text-xs truncate max-w-xs">{trace.rootSpanName}</td>
                <td className="py-2 px-3">{trace.durationMs.toFixed(2)} ms</td>
                <td className="py-2 px-3"><StatusBadge status={trace.status} /></td>
                <td className="py-2 px-3">{trace.spanCount}</td>
                <td className="py-2 px-3 text-muted-foreground text-xs">{formatTime(trace.startTime)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} total traces</span>
        <div className="flex gap-2 items-center">
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage <= 1}
            onClick={() => setPage(Math.max(0, offset - limit))}
          >
            ← Prev
          </Button>
          <span>Page {currentPage} of {totalPages || 1}</span>
          <Button
            size="sm"
            variant="outline"
            disabled={offset + limit >= total}
            onClick={() => setPage(offset + limit)}
          >
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
}

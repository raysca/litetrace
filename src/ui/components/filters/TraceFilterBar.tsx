import React, { useState } from "react";
import { ServiceFilter } from "./ServiceFilter";
import { StatusFilter } from "./StatusFilter";
import { DateRangeFilter } from "./DateRangeFilter";
import { LatencyRangeFilter } from "./LatencyRangeFilter";
import { SpanNameFilter } from "./SpanNameFilter";
import { CostRangeFilter } from "./CostRangeFilter";
import { Button } from "../../components/ui/button";

interface TraceFilterBarProps {
  onFilter: (filters: {
    service?: string;
    status?: string;
    from?: number;
    to?: number;
    spanName?: string;
    latencyMinMs?: number;
    latencyMaxMs?: number;
    costMinUsd?: number;
    costMaxUsd?: number;
  }) => void;
  onRefresh: () => void;
}

export function TraceFilterBar({ onFilter, onRefresh }: TraceFilterBarProps) {
  // Basic filters (auto-apply)
  const [service, setService] = useState("");
  const [status, setStatus] = useState("");
  const [fromMs, setFromMs] = useState<number | undefined>();
  const [toMs, setToMs] = useState<number | undefined>();

  // Advanced filters (require manual apply)
  const [spanName, setSpanName] = useState("");
  const [latencyMinMs, setLatencyMinMs] = useState<number | undefined>();
  const [latencyMaxMs, setLatencyMaxMs] = useState<number | undefined>();
  const [costMinUsd, setCostMinUsd] = useState<number | undefined>();
  const [costMaxUsd, setCostMaxUsd] = useState<number | undefined>();

  // Apply basic filters immediately
  const handleBasicFilterChange = (newFilters: any) => {
    onFilter({
      service: newFilters.service || undefined,
      status: newFilters.status || undefined,
      from: newFilters.fromMs,
      to: newFilters.toMs,
      spanName: spanName || undefined,
      latencyMinMs,
      latencyMaxMs,
      costMinUsd,
      costMaxUsd,
    });
  };

  const handleServiceChange = (s: string) => {
    setService(s);
    handleBasicFilterChange({ service: s, status, fromMs, toMs });
  };

  const handleStatusChange = (s: string) => {
    setStatus(s);
    handleBasicFilterChange({ service, status: s, fromMs, toMs });
  };

  const handleDateRangeChange = (from?: number, to?: number) => {
    setFromMs(from);
    setToMs(to);
    handleBasicFilterChange({ service, status, fromMs: from, toMs: to });
  };

  const handleApplyAdvanced = () => {
    onFilter({
      service: service || undefined,
      status: status || undefined,
      from: fromMs,
      to: toMs,
      spanName: spanName || undefined,
      latencyMinMs,
      latencyMaxMs,
      costMinUsd,
      costMaxUsd,
    });
  };

  const handleClearAll = () => {
    setService("");
    setStatus("");
    setFromMs(undefined);
    setToMs(undefined);
    setSpanName("");
    setLatencyMinMs(undefined);
    setLatencyMaxMs(undefined);
    setCostMinUsd(undefined);
    setCostMaxUsd(undefined);
    onFilter({});
  };

  const hasAdvancedFilters =
    spanName || latencyMinMs !== undefined || latencyMaxMs !== undefined ||
    costMinUsd !== undefined || costMaxUsd !== undefined;

  return (
    <div className="flex flex-col gap-3 p-4 border-b bg-card rounded-lg">
      {/* Row 1: Basic Filters */}
      <div className="flex gap-4 items-end flex-wrap">
        <ServiceFilter value={service} onChange={handleServiceChange} />
        <StatusFilter value={status} onChange={handleStatusChange} />
        <DateRangeFilter fromMs={fromMs} toMs={toMs} onChange={handleDateRangeChange} />
      </div>

      {/* Row 2: Advanced Filters */}
      <div className="flex gap-4 items-end flex-wrap">
        <LatencyRangeFilter
          minMs={latencyMinMs}
          maxMs={latencyMaxMs}
          onSelect={(min, max) => {
            setLatencyMinMs(min);
            setLatencyMaxMs(max);
          }}
        />
        <SpanNameFilter value={spanName} onChange={setSpanName} />
        <CostRangeFilter
          minUsd={costMinUsd}
          maxUsd={costMaxUsd}
          onSelect={(min, max) => {
            setCostMinUsd(min);
            setCostMaxUsd(max);
          }}
        />
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {hasAdvancedFilters && (
          <Button size="sm" onClick={handleApplyAdvanced}>
            Apply Filters
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={handleClearAll}>
          Clear All
        </Button>
        <Button size="sm" variant="ghost" onClick={onRefresh}>
          ↻ Refresh
        </Button>
      </div>
    </div>
  );
}

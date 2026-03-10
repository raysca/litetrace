import React from "react";
import { Input } from "../../../components/ui/input";

interface LatencyRangeFilterProps {
  minMs?: number;
  maxMs?: number;
  onSelect: (minMs?: number, maxMs?: number) => void;
}

const PRESETS = [
  { label: "< 100ms", minMs: undefined, maxMs: 100 },
  { label: "100-500ms", minMs: 100, maxMs: 500 },
  { label: "500ms-1s", minMs: 500, maxMs: 1000 },
  { label: "> 1s", minMs: 1000, maxMs: undefined },
];

export function LatencyRangeFilter({ minMs, maxMs, onSelect }: LatencyRangeFilterProps) {
  const [showCustom, setShowCustom] = React.useState(false);
  const [customMin, setCustomMin] = React.useState(minMs?.toString() ?? "");
  const [customMax, setCustomMax] = React.useState(maxMs?.toString() ?? "");

  const isActive = minMs !== undefined || maxMs !== undefined;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-muted-foreground">Latency</label>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => {
              onSelect(p.minMs, p.maxMs);
              setShowCustom(false);
            }}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              minMs === p.minMs && maxMs === p.maxMs
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 border border-input"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`px-3 py-1 rounded text-xs font-medium transition-all ${
            showCustom
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80 border border-input"
          }`}
        >
          Custom
        </button>
      </div>
      {showCustom && (
        <div className="flex gap-2 mt-2">
          <Input
            type="number"
            placeholder="Min (ms)"
            value={customMin}
            onChange={e => setCustomMin(e.target.value)}
            className="w-24"
          />
          <Input
            type="number"
            placeholder="Max (ms)"
            value={customMax}
            onChange={e => setCustomMax(e.target.value)}
            className="w-24"
          />
          <button
            onClick={() => {
              const min = customMin ? parseInt(customMin) : undefined;
              const max = customMax ? parseInt(customMax) : undefined;
              onSelect(min, max);
              setShowCustom(false);
            }}
            className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

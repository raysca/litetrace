import React from "react";
import { Input } from "../../../components/ui/input";

interface CostRangeFilterProps {
  minUsd?: number;
  maxUsd?: number;
  onSelect: (minUsd?: number, maxUsd?: number) => void;
}

const PRESETS = [
  { label: "< $0.01", minUsd: undefined, maxUsd: 0.01 },
  { label: "$0.01 - $0.10", minUsd: 0.01, maxUsd: 0.10 },
  { label: "> $0.10", minUsd: 0.10, maxUsd: undefined },
];

export function CostRangeFilter({ minUsd, maxUsd, onSelect }: CostRangeFilterProps) {
  const [showCustom, setShowCustom] = React.useState(false);
  const [customMin, setCustomMin] = React.useState(minUsd?.toString() ?? "");
  const [customMax, setCustomMax] = React.useState(maxUsd?.toString() ?? "");

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-muted-foreground">Cost</label>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => {
              onSelect(p.minUsd, p.maxUsd);
              setShowCustom(false);
            }}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              minUsd === p.minUsd && maxUsd === p.maxUsd
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
            placeholder="Min ($)"
            value={customMin}
            onChange={e => setCustomMin(e.target.value)}
            className="w-24"
            step="0.01"
          />
          <Input
            type="number"
            placeholder="Max ($)"
            value={customMax}
            onChange={e => setCustomMax(e.target.value)}
            className="w-24"
            step="0.01"
          />
          <button
            onClick={() => {
              const min = customMin ? parseFloat(customMin) : undefined;
              const max = customMax ? parseFloat(customMax) : undefined;
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

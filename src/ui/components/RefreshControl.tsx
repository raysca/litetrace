import { RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { useAutoRefresh } from "../hooks/useAutoRefresh";

interface Props {
  onRefresh: () => void;
  refreshing?: boolean;
  storageKey?: string;
}

export function RefreshControl({ onRefresh, refreshing, storageKey }: Props) {
  const { intervalMs, select, INTERVALS } = useAutoRefresh(onRefresh, storageKey);

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="outline"
        onClick={onRefresh}
        disabled={refreshing}
        className="gap-1.5 px-2"
        title="Refresh now"
      >
        <RefreshCw
          size={13}
          className={cn(
            refreshing && "animate-spin",
            !refreshing && intervalMs && "animate-[spin_3s_linear_infinite] opacity-60"
          )}
        />
      </Button>
      <select
        value={intervalMs ?? "null"}
        onChange={e => {
          const v = e.target.value;
          select(v === "null" ? null : Number(v));
        }}
        className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        title="Auto-refresh interval"
      >
        {INTERVALS.map(opt => (
          <option key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface DateRangeFilterProps {
  fromMs?: number;
  toMs?: number;
  onChange: (from?: number, to?: number) => void;
}

export function DateRangeFilter({ fromMs, toMs, onChange }: DateRangeFilterProps) {
  function formatDate(ms?: number): string {
    if (!ms) return "";
    return new Date(ms).toISOString().split("T")[0];
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-muted-foreground">Date Range</label>
      <div className="flex gap-2">
        <input
          type="date"
          value={formatDate(fromMs)}
          onChange={e => {
            const ms = e.target.value ? new Date(e.target.value).getTime() : undefined;
            onChange(ms, toMs);
          }}
          className="h-9 rounded-md border border-input px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <input
          type="date"
          value={formatDate(toMs)}
          onChange={e => {
            const ms = e.target.value ? new Date(e.target.value).getTime() : undefined;
            onChange(fromMs, ms);
          }}
          className="h-9 rounded-md border border-input px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    </div>
  );
}

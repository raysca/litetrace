import { Input } from "../../../components/ui/input";

interface SpanNameFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function SpanNameFilter({ value, onChange }: SpanNameFilterProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-muted-foreground">Root Span</label>
      <Input
        placeholder="All spans"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-40"
      />
    </div>
  );
}

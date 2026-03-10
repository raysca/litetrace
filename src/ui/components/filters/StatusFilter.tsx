interface StatusFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-muted-foreground">Status</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-32"
      >
        <option value="">All</option>
        <option value="ok">ok</option>
        <option value="error">error</option>
        <option value="unset">unset</option>
      </select>
    </div>
  );
}

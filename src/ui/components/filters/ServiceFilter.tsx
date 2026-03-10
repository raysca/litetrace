import { Input } from "../../../components/ui/input";

interface ServiceFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function ServiceFilter({ value, onChange }: ServiceFilterProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-muted-foreground">Service</label>
      <Input
        placeholder="All services"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-40"
      />
    </div>
  );
}

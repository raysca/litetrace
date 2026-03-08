import { useState } from "react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

interface TraceFiltersProps {
  onFilter: (filters: { service?: string; status?: string; from?: number; to?: number }) => void;
  onRefresh: () => void;
}

export function TraceFilters({ onFilter, onRefresh }: TraceFiltersProps) {
  const [service, setService] = useState("");
  const [status, setStatus] = useState("");

  function handleApply() {
    onFilter({
      service: service || undefined,
      status: status || undefined,
    });
  }

  function handleClear() {
    setService("");
    setStatus("");
    onFilter({});
  }

  return (
    <div className="flex gap-2 items-center flex-wrap">
      <Input
        placeholder="Service name"
        value={service}
        onChange={e => setService(e.target.value)}
        className="w-48"
        onKeyDown={e => e.key === "Enter" && handleApply()}
      />
      <select
        value={status}
        onChange={e => setStatus(e.target.value)}
        className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">All statuses</option>
        <option value="ok">ok</option>
        <option value="error">error</option>
        <option value="unset">unset</option>
      </select>
      <Button size="sm" onClick={handleApply}>Filter</Button>
      <Button size="sm" variant="outline" onClick={handleClear}>Clear</Button>
      <Button size="sm" variant="ghost" onClick={onRefresh}>↻ Refresh</Button>
    </div>
  );
}

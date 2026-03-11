import { useEffect, useState } from "react";

interface ServiceFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function ServiceFilter({ value, onChange }: ServiceFilterProps) {
  const [services, setServices] = useState<string[]>([]);
  
  useEffect(() => {
    fetch("/api/services")
      .then(res => res.json())
      .then(data => setServices(data || []))
      .catch(err => console.error("Failed to load services", err));
  }, []);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-muted-foreground">Service</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-40"
      >
        <option value="">All services</option>
        {services.map(service => (
          <option key={service} value={service}>
            {service}
          </option>
        ))}
      </select>
    </div>
  );
}

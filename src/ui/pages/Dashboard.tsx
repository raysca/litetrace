import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

interface DashboardStats {
  totalTraces: number;
  totalLlmCalls: number;
  totalCostUsd: number;
  totalTokens: number;
  byModel: { model: string | null; totalCost: number | null; totalTokens: number | null; callCount: number }[];
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then(r => r.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  if (!stats) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  const statCards = [
    { label: "Total Traces",   value: stats.totalTraces.toLocaleString() },
    { label: "LLM Calls",      value: stats.totalLlmCalls.toLocaleString() },
    { label: "Total Tokens",   value: stats.totalTokens.toLocaleString() },
    { label: "Total Cost",     value: `$${(stats.totalCostUsd ?? 0).toFixed(4)}` },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(c => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.byModel.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Usage by Model</h2>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Model", "Calls", "Tokens", "Cost (USD)"].map(h => (
                    <th key={h} className="px-4 py-2 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.byModel.map((row, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">{row.model ?? "—"}</td>
                    <td className="px-4 py-2">{row.callCount}</td>
                    <td className="px-4 py-2">{(row.totalTokens ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-2">${(row.totalCost ?? 0).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

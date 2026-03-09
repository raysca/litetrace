import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

interface AnalyticsStats {
  byDay: { day: string; totalCost: number; totalTokens: number; callCount: number }[];
  byProvider: { provider: string | null; callCount: number; totalCost: number; totalTokens: number }[];
}

export function Analytics() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);

  useEffect(() => {
    fetch("/api/analytics/stats").then(r => r.json()).then(setStats).catch(console.error);
  }, []);

  if (!stats) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily usage table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Daily LLM Usage</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {stats.byDay.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4">No data yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {["Date", "Calls", "Tokens", "Cost"].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.byDay.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2 text-xs font-mono">{row.day}</td>
                      <td className="px-3 py-2">{row.callCount}</td>
                      <td className="px-3 py-2">{row.totalTokens.toLocaleString()}</td>
                      <td className="px-3 py-2">${row.totalCost.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Provider breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">By Provider</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {stats.byProvider.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4">No data yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {["Provider", "Calls", "Tokens", "Cost"].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.byProvider.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2 capitalize">{row.provider ?? "unknown"}</td>
                      <td className="px-3 py-2">{row.callCount}</td>
                      <td className="px-3 py-2">{row.totalTokens.toLocaleString()}</td>
                      <td className="px-3 py-2">${row.totalCost.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

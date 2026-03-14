import { useState } from "react";

interface BarChartProps<T extends Record<string, unknown>> {
  data: T[];
  xKey: keyof T;
  yKey: keyof T;
  color: string;
  formatTick: (v: number) => string;
  formatTooltip: (v: number) => string;
  height?: number;
}

function niceMax(rawMax: number): number {
  if (rawMax === 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const f = rawMax / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * exp;
}

function niceTicks(max: number, count = 4): number[] {
  const step = max / count;
  const ticks: number[] = [];
  for (let i = 0; i <= count; i++) ticks.push(Math.round(step * i * 100) / 100);
  return ticks;
}

export function BarChart<T extends Record<string, unknown>>({
  data,
  xKey,
  yKey,
  color,
  formatTick,
  formatTooltip,
  height = 160,
}: BarChartProps<T>) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No data for this period
      </div>
    );
  }

  // Layout constants (logical units)
  const VW = 800;
  const VH = height;
  const PAD = { top: 8, right: 8, bottom: 24, left: 56 };
  const chartW = VW - PAD.left - PAD.right;
  const chartH = VH - PAD.top - PAD.bottom;

  const values = data.map(d => Number(d[yKey]) || 0);
  const rawMax = Math.max(...values, 0);
  const yMax = niceMax(rawMax);
  const ticks = niceTicks(yMax);

  function yPos(v: number) {
    return chartH - (v / yMax) * chartH;
  }

  const n = data.length;
  const slotW = chartW / n;
  const barW = Math.min(36, slotW * 0.6);
  const maxLabels = 10;
  const labelEvery = Math.max(1, Math.ceil(n / maxLabels));

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHovered(null)}
      >
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* Horizontal grid + Y-axis labels */}
          {ticks.map(v => {
            const y = yPos(v);
            return (
              <g key={v}>
                <line
                  x1={0} x2={chartW} y1={y} y2={y}
                  stroke="#888" strokeOpacity={0.18} strokeDasharray="4 3" strokeWidth={1}
                />
                <text
                  x={-8} y={y + 4}
                  textAnchor="end" fontSize={10} fill="currentColor" opacity={0.55}
                >
                  {formatTick(v)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((d, i) => {
            const v = Number(d[yKey]) || 0;
            const bH = Math.max(v > 0 ? 2 : 0, (v / yMax) * chartH);
            const xCenter = (i + 0.5) * slotW;
            const isHovered = hovered === i;
            return (
              <rect
                key={i}
                x={xCenter - barW / 2}
                y={yPos(v)}
                width={barW}
                height={bH}
                rx={2}
                fill={color}
                opacity={hovered === null ? 0.85 : isHovered ? 1 : 0.4}
                style={{ cursor: "default", transition: "opacity 0.1s" }}
                onMouseEnter={() => setHovered(i)}
              />
            );
          })}

          {/* X-axis labels */}
          {data.map((d, i) => {
            if (i % labelEvery !== 0 && i !== n - 1) return null;
            const xCenter = (i + 0.5) * slotW;
            return (
              <text
                key={i}
                x={xCenter} y={chartH + 16}
                textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.55}
              >
                {String(d[xKey])}
              </text>
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {hovered !== null && (
        <div
          className="absolute pointer-events-none z-10 bg-background border border-border rounded px-3 py-2 text-xs shadow-md"
          style={{
            left: `${((PAD.left + (hovered + 0.5) * (chartW / n)) / VW) * 100}%`,
            top: `${(PAD.top / VH) * 100}%`,
            transform: "translate(-50%, -110%)",
          }}
        >
          <p className="text-muted-foreground mb-0.5">{String(data[hovered][xKey])}</p>
          <p className="font-semibold">{formatTooltip(Number(data[hovered][yKey]) || 0)}</p>
        </div>
      )}
    </div>
  );
}

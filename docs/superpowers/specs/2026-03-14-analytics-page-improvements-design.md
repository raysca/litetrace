# Analytics Page Improvements — Design Spec
**Date:** 2026-03-14
**Status:** Approved

---

## Problem

The Analytics page has three gaps relative to the Dashboard:
1. Uses a simple 3-preset dropdown (7d/30d/90d) instead of the shared `TimeRangePicker`
2. Only shows two charts (cost over time, latency distribution) — no token volume, request count, or error rate trends
3. Backend only returns `costByDay`; no unified time-series shape for all four metrics

---

## Goal

Expand the Analytics page to show a 2×2 grid of time-series charts, replace the date picker with `TimeRangePicker`, and extend the backend to supply all four metrics per day.

---

## Data Layer

### Backend: `src/api/handlers/analytics.ts`

Add a `volumeByDay` array to the response, replacing `costByDay`:

```ts
volumeByDay: {
  date: string;        // YYYY-MM-DD, keyed to traces.startTime
  costUsd: number;
  tokens: number;
  requests: number;
  errorRate: number;   // percentage 0–100
}[]
```

**Implementation:**

- **Query A** — `traces` grouped by date within `[fromUs, toUs]`, using `traces.startTime`:
  ```sql
  strftime('%Y-%m-%d', datetime(start_time/1000000, 'unixepoch')) as date,
  COUNT(*) as requests,
  SUM(CASE WHEN status='error' THEN 1 ELSE 0 END) as errors
  ```

- **Query B** — `observations` joined to `traces` on `observations.traceId = traces.id`, filtered by `traces.startTime` (not `observations.createdAt`), grouped by the same date expression on `traces.startTime`:
  ```sql
  strftime('%Y-%m-%d', datetime(traces.start_time/1000000, 'unixepoch')) as date,
  SUM(observations.total_tokens) as tokens,
  SUM(observations.cost_usd) as costUsd
  ```
  Using `traces.startTime` as the anchor for both queries guarantees date keys align when merged.

- Merge A and B by date in TypeScript (Map lookup). Compute `errorRate = (errors / requests) * 100`.
- Remove the existing `costByDay` query — `volumeByDay` supersedes it.

No schema changes required.

---

## Frontend

### New component: `src/ui/components/AreaChart.tsx`

Generic reusable area/line chart extracted from the existing inline `CostChart` SVG in `Analytics.tsx`.

**Props:**
```ts
interface AreaChartProps<T> {
  data: T[];
  xKey: keyof T;           // date label for x-axis
  yKey: keyof T;           // numeric value
  color: string;           // stroke + fill color
  gradientId: string;      // unique SVG gradient ID — caller must ensure uniqueness per page
  formatTooltip: (v: number) => string;
  height?: number;
}
```

`gradientId` is required and caller-provided to avoid SVG ID collisions when multiple `AreaChart` instances appear on the same page. No y-axis ticks — the area chart stays compact (matching the current `CostChart` style: `PAD_X = 8`, no left padding). The `formatTooltip` prop is used for hover tooltips only.

Renders: gradient fill area, line path, x-axis date labels (max 10), hover tooltip via React state (same approach as `BarChart`).

Edge cases:
- **Empty data** (`data.length === 0`): render centered `"No data for this period"` text, matching `BarChart`'s empty state.
- **Single data point** (`data.length === 1`): place the point at `x = plotW / 2` (centered), same guard as the existing `CostChart`.

### Updated: `src/ui/hooks/useAnalytics.ts`

- Replace `costByDay: { date: string; costUsd: number }[]` with `volumeByDay: { date: string; costUsd: number; tokens: number; requests: number; errorRate: number }[]` in `AnalyticsData` type
- No fetch logic changes needed

### Updated: `src/ui/pages/Analytics.tsx`

**Date picker state:** Replace `presetIdx` state + `PRESETS` array + dropdown with explicit `from`/`to` state initialized lazily:
```ts
const [from, setFrom] = useState(() => Date.now() - 30 * 24 * 60 * 60 * 1000);
const [to, setTo] = useState(() => Date.now());
```
`TimeRangePicker` onChange: `(f, t) => { setFrom(f); setTo(t); }`.

**Topbar subtitle:** The current paragraph reads `Cost, latency & token analysis · {PRESETS[presetIdx].label}`. Replace the entire paragraph text with just `Cost, latency & token analysis` (remove the separator and dynamic preset label entirely).

**Chart section:** Replace the current 2-column chart row with a 2×2 grid (`grid grid-cols-1 lg:grid-cols-2`):

| Position | Chart | Component | `gradientId` | Color | `formatTick` | `formatTooltip` |
|---|---|---|---|---|---|---|
| Top-left | Cost over time | `AreaChart` | `"analyticsGradCost"` | `#3b82f6` | — | `v => "$" + v.toFixed(4)` |
| Top-right | Token volume | `BarChart` | — | `#8b5cf6` | `v => v >= 1000 ? (v/1000).toFixed(0)+"K" : String(v)` | `v => v.toLocaleString() + " tokens"` |
| Bottom-left | Request count | `BarChart` | — | `#3b82f6` | `v => String(Math.round(v))` | `v => Math.round(v) + " requests"` |
| Bottom-right | Error rate % | `AreaChart` | `"analyticsGradError"` | `#ef4444` | — | `v => v.toFixed(1) + "%"` |

Each cell: labeled `<h2>` header, `height={120}` passed explicitly to both `AreaChart` and `BarChart`. Loading state: `animate-pulse bg-muted rounded` placeholder at the same height, matching the existing skeleton pattern.

**Latency distribution chart:** Moves below the 2×2 grid, full-width, above the model table. Unchanged otherwise.

**Empty state condition:** Change from `data.byModel.length === 0` to:
```ts
data.byModel.length === 0 && data.volumeByDay.every(d => d.requests === 0)
```
This handles users who have HTTP traces (requests + errors) but no LLM observations (no model data).

### Updated: `src/ui/components/AnalyticsEmpty.tsx`

Replace the current ghost charts row (one wide area chart + one latency bar chart, `grid grid-cols-2`) with a 2×2 grid of four equal ghost cells, each at `height: 140`. Reuse the existing `COST_BARS` constant (10 bars) for the two area-chart-style cells (cost, error rate) and a new `SMALL_BARS = [40, 65, 55, 80, 50, 90, 70, 45]` (8 bars) for the two bar-chart-style cells (tokens, requests). Each cell has a ghost header label above it. The latency distribution chart ghost is removed from this row — it is not shown in the empty state (latency percentile data only exists when observations are present). The ghost table below remains unchanged.

---

## Files Modified

| File | Change |
|---|---|
| `src/api/handlers/analytics.ts` | Add `volumeByDay` (trace-anchored date join), remove `costByDay` |
| `src/ui/hooks/useAnalytics.ts` | Update `AnalyticsData` type |
| `src/ui/pages/Analytics.tsx` | `TimeRangePicker`, `from`/`to` state, 2×2 chart grid, subtitle, empty state condition |
| `src/ui/components/AnalyticsEmpty.tsx` | Update ghost skeleton to 2×2 grid |

## Files Created

| File | Purpose |
|---|---|
| `src/ui/components/AreaChart.tsx` | Generic reusable area/line SVG chart with unique `gradientId` prop |

---

## What's Not In Scope

- LLM viewer improvements (separate spec)
- Analytics export changes
- New backend routes or schema migrations
- Y-axis tick labels on `AreaChart` (kept compact, tooltip-only)

import { useState, useRef, useEffect } from "react";
import type { SpanRow, Observation } from "../hooks/useTrace";
import {
  Zap, Globe, Layers, Database, Braces, AlertCircle,
  Clock, Tag, X, Circle,
} from "lucide-react";

interface SpanTimelineProps {
  spans: SpanRow[];
  observations: Observation[];
  traceStartTime: number;
  traceEndTime: number;
}

const NAME_COL = 320;

type IconInfo = { Icon: React.ElementType; cls: string };

function getIcon(span: SpanRow, isLlm: boolean): IconInfo {
  if (span.statusCode === "error") return { Icon: AlertCircle, cls: "text-red-500" };
  if (!span.parentSpanId) return { Icon: Zap, cls: "text-blue-500" };
  if (isLlm) return { Icon: Globe, cls: "text-blue-500" };
  const n = span.name.toLowerCase();
  if (n.includes("cache")) return { Icon: Layers, cls: "text-slate-400" };
  if (n.includes("vector") || n.includes("store") || n.includes("retriev") || n.includes("embed"))
    return { Icon: Database, cls: "text-slate-400" };
  if (n.includes("token") || n.includes("encode") || n.includes("decode"))
    return { Icon: Braces, cls: "text-slate-400" };
  return { Icon: Circle, cls: "text-slate-400" };
}

function niceStep(totalMs: number): number {
  const rough = totalMs / 4;
  for (const s of [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000]) {
    if (s >= rough) return s;
  }
  return 10000;
}

function treeOrder(spans: SpanRow[]): { span: SpanRow; depth: number }[] {
  const byParent = new Map<string | null, SpanRow[]>();
  for (const s of spans) {
    const k = s.parentSpanId;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(s);
  }
  byParent.forEach(arr => arr.sort((a, b) => a.startTime - b.startTime));
  const out: { span: SpanRow; depth: number }[] = [];
  function dfs(pid: string | null, d: number) {
    for (const s of byParent.get(pid) ?? []) {
      out.push({ span: s, depth: d });
      dfs(s.id, d + 1);
    }
  }
  dfs(null, 0);
  return out;
}

interface TooltipState {
  span: SpanRow;
  obs: Observation | undefined;
  offsetMs: number;
  x: number;
  y: number;
}

export function SpanTimeline({
  spans,
  observations,
  traceStartTime,
  traceEndTime,
}: SpanTimelineProps) {
  const [selected, setSelected] = useState<SpanRow | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close panel when spans change (e.g. navigated to new trace)
  useEffect(() => { setSelected(null); }, [traceStartTime]);

  const totalDuration = traceEndTime - traceStartTime;
  if (totalDuration === 0) {
    return <p className="text-muted-foreground text-sm p-4">No timeline data</p>;
  }

  const totalMs = totalDuration / 1000;
  const obsMap = new Map(observations.map(o => [o.spanId, o]));
  const ordered = treeOrder(spans);
  const step = niceStep(totalMs);
  const ticks: number[] = [];
  for (let t = 0; t <= totalMs + step * 0.01; t += step) ticks.push(t);

  function leftPct(span: SpanRow) {
    return ((span.startTime - traceStartTime) / totalDuration) * 100;
  }
  function widthPct(span: SpanRow) {
    return Math.max(((span.endTime - span.startTime) / totalDuration) * 100, 0.3);
  }

  function handleBarMouseEnter(e: React.MouseEvent, span: SpanRow) {
    const obs = obsMap.get(span.id);
    const offsetMs = (span.startTime - traceStartTime) / 1000;
    const rect = rootRef.current?.getBoundingClientRect();
    setTooltip({
      span, obs, offsetMs,
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
    });
  }

  // Detail panel data
  const selObs = selected ? obsMap.get(selected.id) : undefined;
  const selOffsetMs = selected ? (selected.startTime - traceStartTime) / 1000 : 0;
  const selEndMs = selected ? selOffsetMs + selected.durationMs : 0;
  const selPct = selected ? (selected.durationMs / (totalDuration / 1000)) * 100 : 0;
  let selAttrs: Record<string, unknown> = {};
  if (selected) {
    try { selAttrs = JSON.parse(selected.attributes); } catch {}
  }
  const selIcon = selected ? getIcon(selected, !!selObs) : null;

  const ROW_H = 44;

  return (
    <div ref={rootRef} className="relative flex overflow-hidden" style={{ height: "calc(100vh - 250px)", minHeight: 360 }}>

      {/* ─── Main two-column timeline ─────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">

        {/* Scrollable area with sticky name column */}
        <div className="flex-1 overflow-auto">
          {/* Min-width so horizontal scroll kicks in when zoomed */}
          <div style={{ minWidth: NAME_COL + 300 }}>

            {/* Header row */}
            <div
              className="flex sticky top-0 z-20 border-b"
              style={{ backgroundColor: "#F8F8F8", height: 36 }}
            >
              {/* Name header — sticky left */}
              <div
                className="sticky left-0 z-30 flex items-center px-4 border-r text-[10px] uppercase tracking-widest text-muted-foreground font-semibold shrink-0"
                style={{ width: NAME_COL, backgroundColor: "#F8F8F8" }}
              >
                Span Name
              </div>

              {/* Time ruler */}
              <div
                className="flex-1 relative"
                style={{ minWidth: 0 }}
              >
                <div className="absolute inset-0">
                  {ticks.map(t => {
                    const pct = (t / totalMs) * 100;
                    if (pct > 100.5) return null;
                    return (
                      <div
                        key={t}
                        className="absolute top-0 bottom-0 flex flex-col justify-between"
                        style={{ left: `${pct}%` }}
                      >
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap -translate-x-1/2 mt-1.5">
                          {t}ms
                        </span>
                        <div className="w-px h-2 bg-border" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Span rows */}
            {ordered.map(({ span, depth }) => {
              const obs = obsMap.get(span.id);
              const isLlm = !!obs;
              const isError = span.statusCode === "error";
              const isSelected = selected?.id === span.id;
              const { Icon, cls } = getIcon(span, isLlm);

              const nameColor = isError
                ? "text-red-500"
                : isLlm || !span.parentSpanId
                  ? "text-blue-600"
                  : "text-[#333333]";

              const rowBg = isSelected
                ? "bg-blue-50"
                : isError
                  ? "bg-red-50/50"
                  : "";

              return (
                <div
                  key={span.id}
                  className={`flex border-b border-border/40 cursor-pointer transition-colors ${rowBg} ${!isSelected && !isError ? "hover:bg-slate-50/70" : ""}`}
                  style={{ height: ROW_H }}
                  onClick={() => setSelected(isSelected ? null : span)}
                >
                  {/* Name cell — sticky left */}
                  <div
                    className={`sticky left-0 z-10 flex items-center gap-2 border-r shrink-0 ${rowBg || "bg-white"} ${!isSelected && !isError ? "group-hover:bg-slate-50/70" : ""}`}
                    style={{
                      width: NAME_COL,
                      paddingLeft: 12 + depth * 20,
                      backgroundColor: isSelected ? "#EFF6FF" : isError ? "rgba(254,242,242,0.5)" : "white",
                    }}
                  >
                    <Icon size={13} className={`${cls} shrink-0`} />
                    <span className={`text-[13px] font-medium truncate ${nameColor}`}>
                      {span.name}
                    </span>
                  </div>

                  {/* Bar cell */}
                  <div className="flex-1 relative" style={{ minWidth: 0 }}>
                    <div className="absolute inset-y-0 flex items-center" style={{ left: 0, right: 0 }}>
                      <div
                        className="absolute flex items-center"
                        style={{
                          left: `${leftPct(span)}%`,
                          width: `${widthPct(span)}%`,
                          height: 22,
                        }}
                        onMouseEnter={e => handleBarMouseEnter(e, span)}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <div
                          className={`absolute inset-0 ${isError ? "bg-red-400" : "bg-blue-500"} ${
                            !isLlm && span.parentSpanId ? "opacity-[0.65]" : ""
                          }`}
                        />
                        <span className="relative z-10 pl-1.5 text-[11px] font-medium text-white whitespace-nowrap overflow-hidden select-none">
                          {span.durationMs < 1
                            ? `${(span.durationMs * 1000).toFixed(0)}μs`
                            : `${Math.round(span.durationMs)}ms`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Detail panel ─────────────────────────────────────────── */}
      {selected && selIcon && (
        <div
          className="shrink-0 flex flex-col overflow-hidden border-l bg-white"
          style={{ width: 280 }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <selIcon.Icon size={14} className={selIcon.cls} />
              <span className="text-[13px] font-semibold text-foreground truncate">{selected.name}</span>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Timing */}
            <div className="px-4 py-4 border-b">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
                <Clock size={10} />
                Timing
              </div>
              {[
                { label: "Start offset", value: `${selOffsetMs.toFixed(0)}ms`, blue: false },
                { label: "Duration", value: `${Math.round(selected.durationMs)}ms`, blue: true },
                { label: "End time", value: `${selEndMs.toFixed(0)}ms`, blue: false },
                { label: "% of total", value: `${selPct.toFixed(1)}%`, blue: false },
              ].map(({ label, value, blue }) => (
                <div key={label} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                  <span className="text-[12px] text-muted-foreground">{label}</span>
                  <span className={`text-[13px] font-semibold ${blue ? "text-blue-600" : "text-foreground"}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Attributes */}
            {Object.keys(selAttrs).length > 0 && (
              <div className="px-4 py-4">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
                  <Tag size={10} />
                  Attributes
                </div>
                {Object.entries(selAttrs).map(([key, val], i) => (
                  <div
                    key={key}
                    className={`flex items-start justify-between gap-3 py-2.5 border-b border-border/30 last:border-0 ${i % 2 !== 0 ? "bg-slate-50/60 -mx-4 px-4" : ""}`}
                  >
                    <span className="text-[11px] text-muted-foreground font-mono break-all leading-relaxed min-w-0">
                      {key}
                    </span>
                    <span className="text-[12px] font-semibold text-foreground text-right break-all min-w-0 shrink-0 max-w-[48%]">
                      {String(val)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Hover tooltip ────────────────────────────────────────── */}
      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{ left: tooltip.x + 14, top: tooltip.y - 8 }}
        >
          <div className="bg-[#111111] text-white rounded px-3 py-2 shadow-xl" style={{ minWidth: 160 }}>
            <p className="text-[12px] font-semibold mb-1">{tooltip.span.name}</p>
            <p className="text-[11px] text-white/65">
              {Math.round(tooltip.span.durationMs)}ms · offset: {tooltip.offsetMs.toFixed(0)}ms
            </p>
            {tooltip.obs && (
              <p className="text-[11px] text-white/65 mt-0.5">
                {(tooltip.obs.totalTokens ?? 0).toLocaleString()} tokens · LLM
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, Check, Globe, X } from "lucide-react";

interface TimeRangePickerProps {
  from: number;
  to: number;
  onChange: (from: number, to: number) => void;
}

interface Preset {
  label: string;
  durationMs: number;
}

const PRESETS: Preset[] = [
  { label: "Last 1 hour",  durationMs: 1 * 60 * 60 * 1000 },
  { label: "Last 6 hours", durationMs: 6 * 60 * 60 * 1000 },
  { label: "Last 24 hours",durationMs: 24 * 60 * 60 * 1000 },
  { label: "Last 7 days",  durationMs: 7 * 24 * 60 * 60 * 1000 },
  { label: "Last 30 days", durationMs: 30 * 24 * 60 * 60 * 1000 },
  { label: "Last 90 days", durationMs: 90 * 24 * 60 * 60 * 1000 },
];

function toDateStr(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function fromDateStr(str: string): number {
  // Parse as UTC midnight
  return new Date(str + "T00:00:00Z").getTime();
}

function matchesPreset(from: number, to: number): Preset | null {
  const duration = to - from;
  for (const p of PRESETS) {
    if (Math.abs(duration - p.durationMs) < 60_000) return p;
  }
  return null;
}

function formatLabel(from: number, to: number): string {
  const preset = matchesPreset(from, to);
  if (preset) return preset.label;
  const f = toDateStr(from);
  const t = toDateStr(to);
  return `${f} → ${t}`;
}

export function TimeRangePicker({ from, to, onChange }: TimeRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(toDateStr(from));
  const [customTo, setCustomTo] = useState(toDateStr(to));
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Sync custom inputs when props change externally
  useEffect(() => {
    setCustomFrom(toDateStr(from));
    setCustomTo(toDateStr(to));
  }, [from, to]);

  function selectPreset(p: Preset) {
    const t = Date.now();
    const f = t - p.durationMs;
    onChange(f, t);
    setOpen(false);
  }

  function applyCustom() {
    if (!customFrom || !customTo) return;
    const f = fromDateStr(customFrom);
    let t = fromDateStr(customTo) + 24 * 60 * 60 * 1000 - 1; // end of day
    if (f >= t) return;
    onChange(f, t);
    setOpen(false);
  }

  const activePreset = matchesPreset(from, to);
  const selectedDays = Math.round((to - from) / (24 * 60 * 60 * 1000));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded text-foreground hover:bg-muted transition-colors"
      >
        <Calendar size={12} className="text-muted-foreground" />
        {formatLabel(from, to)}
        <ChevronDown size={12} className="text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-background border border-border rounded shadow-lg flex overflow-hidden min-w-[480px]">
          {/* Left: Quick select */}
          <div className="w-48 border-r border-border py-2">
            <p className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">
              Quick Select
            </p>
            {PRESETS.map(p => {
              const active = activePreset?.label === p.label;
              return (
                <button
                  key={p.label}
                  onClick={() => selectPreset(p)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-xs transition-colors ${
                    active
                      ? "border-l-2 border-blue-500 text-blue-500 bg-blue-500/5 font-medium"
                      : "border-l-2 border-transparent text-foreground hover:bg-muted"
                  }`}
                >
                  {p.label}
                  {active && <Check size={11} className="shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Right: Custom range */}
          <div className="flex-1 p-4 flex flex-col gap-3">
            <p className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">
              Custom Range
            </p>

            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground">FROM</span>
                <div className="flex items-center gap-1 border border-border rounded px-2 py-1.5">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={e => setCustomFrom(e.target.value)}
                    className="flex-1 text-xs bg-transparent outline-none"
                  />
                  {customFrom && (
                    <button onClick={() => setCustomFrom("")}>
                      <X size={11} className="text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground">TO</span>
                <div className="flex items-center gap-1 border border-border rounded px-2 py-1.5">
                  <input
                    type="date"
                    value={customTo}
                    onChange={e => setCustomTo(e.target.value)}
                    className="flex-1 text-xs bg-transparent outline-none"
                  />
                  {customTo && (
                    <button onClick={() => setCustomTo("")}>
                      <X size={11} className="text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
              </label>
            </div>

            {customFrom && customTo && !activePreset && (
              <p className="text-[10px] text-muted-foreground">
                Selected: {selectedDays} day{selectedDays !== 1 ? "s" : ""} ({toDateStr(from)} → {toDateStr(to)})
              </p>
            )}

            <div className="flex gap-2 mt-auto pt-1">
              <button
                onClick={applyCustom}
                disabled={!customFrom || !customTo}
                className="flex-1 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-40"
              >
                Apply Range
              </button>
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 text-xs border border-border rounded hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>

            <div className="flex items-center gap-1 pt-1 border-t border-border text-[10px] text-muted-foreground">
              <Globe size={10} />
              All times in UTC
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

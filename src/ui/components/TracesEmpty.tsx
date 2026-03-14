import { GitBranch, Terminal, Package, Info, ChevronDown } from "lucide-react";

const LORA: React.CSSProperties = { fontFamily: "'Lora', Georgia, serif" };

const GHOST_ROWS = [
  { a: 150, b: 90,  c: 60, d: 50 },
  { a: 160, b: 110, c: 60, d: 60 },
  { a: 140, b: 80,  c: 60, d: 45 },
];

export function TracesEmpty() {
  return (
    <div className="flex flex-col -mx-8" style={{ minHeight: "calc(100vh - 120px)" }}>

      {/* Ghost filter bar */}
      <div
        className="flex items-center gap-2 px-8 border-b border-border"
        style={{ height: 48 }}
      >
        <div className="bg-[#F0F0F0] px-3 py-1.5">
          <span className="text-[11px] font-semibold text-[#CCCCCC]">All</span>
        </div>
        <div className="border border-border px-3 py-1.5">
          <span className="text-[11px] text-[#CCCCCC]">Success</span>
        </div>
        <div className="border border-border px-3 py-1.5">
          <span className="text-[11px] text-[#CCCCCC]">Errors</span>
        </div>
        <div className="w-px h-5 bg-[#E5E5E5]" />
        <div className="flex items-center gap-1.5 border border-border px-3 py-1.5">
          <span className="text-[11px] text-[#CCCCCC]">Model: All</span>
          <ChevronDown size={12} className="text-[#CCCCCC]" />
        </div>
      </div>

      {/* Ghost table header */}
      <div
        className="flex items-center gap-12 bg-[#F8F8F8] px-8 border-b border-border"
        style={{ height: 36 }}
      >
        {[180, 160, 100, 80, 80].map((w, i) => (
          <div key={i} className="h-2.5 rounded-sm bg-[#EEEEEE]" style={{ width: w }} />
        ))}
      </div>

      {/* Ghost rows */}
      {GHOST_ROWS.map((r, i) => (
        <div
          key={i}
          className="flex items-center gap-12 px-8 border-b border-border"
          style={{ height: 52 }}
        >
          <div className="h-3 rounded-sm bg-[#F0F0F0]" style={{ width: r.a }} />
          <div className="h-3 rounded-sm bg-[#F0F0F0]" style={{ width: r.b }} />
          <div className="h-5 rounded-sm bg-[#F0F0F0]" style={{ width: r.c }} />
          <div className="h-3 rounded-sm bg-[#F0F0F0]" style={{ width: r.d }} />
        </div>
      ))}

      {/* Empty state CTA — centered in remaining space */}
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="flex flex-col items-center gap-6" style={{ width: 460 }}>

          {/* Icon */}
          <div
            className="flex items-center justify-center border border-border"
            style={{ width: 64, height: 64 }}
          >
            <GitBranch size={28} className="text-[#CCCCCC]" />
          </div>

          {/* Heading + body */}
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="text-[22px] font-medium" style={LORA}>
              No traces to display
            </h2>
            <p className="text-[13px] text-[#999999] leading-relaxed" style={{ maxWidth: 400 }}>
              Once you instrument your application, every LLM call will appear here with full span details, token counts, and timing.
            </p>
          </div>

          {/* CTA row */}
          <div className="flex items-center gap-3">
            <a
              href="https://opentelemetry.io/docs/instrumentation/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 bg-[#0066CC] text-white text-[12px] font-semibold px-5 py-2.5 hover:bg-[#0052A3] transition-colors"
            >
              <Terminal size={14} />
              View Quickstart
            </a>
            <a
              href="https://opentelemetry.io/ecosystem/registry/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 border border-border text-[#555555] text-[12px] font-medium px-5 py-2.5 hover:bg-muted transition-colors"
            >
              <Package size={14} />
              Browse SDKs
            </a>
          </div>

          {/* Integration tip */}
          <div
            className="flex items-center gap-2.5 w-full bg-[#F8F8F8] border border-border px-4 py-3"
          >
            <Info size={14} className="text-[#0066CC] shrink-0" />
            <span className="text-[12px] text-[#555555]">
              Traces appear within seconds of your first instrumented call.
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}

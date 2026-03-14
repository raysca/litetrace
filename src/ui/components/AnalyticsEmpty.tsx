import { TrendingUp, BookOpen, Zap } from "lucide-react";

const LORA: React.CSSProperties = { fontFamily: "'Lora', Georgia, serif" };

// Fixed ghost bar heights to avoid non-deterministic rendering
const COST_BARS = [30, 55, 45, 70, 40, 85, 60, 95, 50, 75];
const LATENCY_BARS = [55, 80, 100, 70];

export function AnalyticsEmpty() {
  return (
    <div className="flex flex-col -mx-8 -mt-6" style={{ minHeight: "calc(100vh - 56px)" }}>

      {/* Ghost KPI cards */}
      <div className="grid grid-cols-4 divide-x divide-border border-b">
        {[
          { iw: 24, vw: 90, bw: 110 },
          { iw: 28, vw: 110, bw: 130 },
          { iw: 20, vw: 70, bw: 95 },
          { iw: 24, vw: 95, bw: 115 },
        ].map((s, i) => (
          <div key={i} className="flex flex-col justify-between px-6 py-5" style={{ height: 88 }}>
            <div className="h-2.5 rounded-sm bg-[#F0F0F0]" style={{ width: s.iw }} />
            <div className="h-6 rounded-sm bg-[#F0F0F0]" style={{ width: s.vw }} />
            <div className="h-2.5 rounded-sm bg-[#F0F0F0]" style={{ width: s.bw }} />
          </div>
        ))}
      </div>

      {/* Ghost charts row */}
      <div className="grid grid-cols-2 divide-x divide-border border-b">
        <div className="px-8 py-6">
          <div className="h-3.5 w-28 rounded-sm bg-[#F0F0F0] mb-4" />
          <div
            className="flex items-end justify-between gap-1 border border-border bg-[#F8F8F8] px-4 py-4"
            style={{ height: 140 }}
          >
            {COST_BARS.map((h, i) => (
              <div key={i} className="flex-1 bg-[#EEEEEE]" style={{ height: h }} />
            ))}
          </div>
        </div>
        <div className="px-8 py-6">
          <div className="h-3.5 w-36 rounded-sm bg-[#F0F0F0] mb-4" />
          <div
            className="flex items-end justify-around gap-6 border border-border bg-[#F8F8F8] px-8 py-4"
            style={{ height: 140 }}
          >
            {LATENCY_BARS.map((h, i) => (
              <div key={i} className="w-10 bg-[#EEEEEE]" style={{ height: h }} />
            ))}
          </div>
        </div>
      </div>

      {/* Ghost table */}
      <div className="px-8 py-4 border-b">
        <div className="h-3.5 w-36 rounded-sm bg-[#F0F0F0] mb-4" />
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="flex gap-8 items-center">
              <div className="h-3 w-32 rounded-sm bg-[#F0F0F0]" />
              <div className="h-3 w-14 rounded-sm bg-[#F0F0F0]" />
              <div className="h-3 w-20 rounded-sm bg-[#F0F0F0]" />
              <div className="h-3 w-20 rounded-sm bg-[#F0F0F0]" />
              <div className="h-3 w-16 rounded-sm bg-[#F0F0F0]" />
              <div className="h-3 flex-1 rounded-sm bg-[#F0F0F0]" />
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="flex flex-col items-center gap-6" style={{ width: 480 }}>

          <div
            className="flex items-center justify-center border border-border"
            style={{ width: 64, height: 64 }}
          >
            <TrendingUp size={28} className="text-[#CCCCCC]" />
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="text-[22px] font-medium" style={LORA}>
              Analytics will appear here
            </h2>
            <p className="text-[13px] text-[#999999] leading-relaxed" style={{ maxWidth: 420 }}>
              Send LLM traces through the SDK to see cost breakdowns, latency distributions, and model analytics.
            </p>
          </div>

          <div className="flex items-center gap-2 border border-[#E8E8E8] bg-[#FAFAFA] px-4 py-2.5 text-[12px] text-[#999999]">
            Requires at least 10 traces to populate analytics
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { window.location.hash = "/"; }}
              className="flex items-center gap-2 bg-[#0066CC] text-white text-[12px] font-semibold px-5 py-2.5 hover:bg-[#0052A3] transition-colors"
            >
              <Zap size={14} />
              Send Your First Trace
            </button>
            <a
              href="https://opentelemetry.io/docs/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 border border-border text-[#555555] text-[12px] font-medium px-5 py-2.5 hover:bg-muted transition-colors"
            >
              <BookOpen size={14} />
              Read the Docs
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Radio, BookOpen, Key, Copy, CheckCircle2 } from "lucide-react";

const LORA: React.CSSProperties = { fontFamily: "'Lora', Georgia, serif" };

const CODE_LINES = [
  "from opentelemetry import trace",
  "",
  "# Point OTLP exporter to localhost:4318",
  'tracer = trace.get_tracer("my-service")',
];

export function DashboardEmpty() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CODE_LINES.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="flex flex-col -mx-8 -mt-6" style={{ minHeight: "calc(100vh - 56px)" }}>

      {/* Ghost metrics row */}
      <div className="grid grid-cols-4 divide-x divide-border border-b">
        {[
          { iw: 20, vw: 100, bw: 120 },
          { iw: 20, vw: 80,  bw: 140 },
          { iw: 20, vw: 110, bw: 90  },
          { iw: 20, vw: 70,  bw: 100 },
        ].map((s, i) => (
          <div key={i} className="flex flex-col justify-between px-6 py-5" style={{ height: 120 }}>
            <div className="h-2.5 rounded-sm bg-[#F0F0F0]" style={{ width: s.iw }} />
            <div className="h-7 rounded-sm bg-[#F0F0F0]" style={{ width: s.vw }} />
            <div className="h-2.5 rounded-sm bg-[#F0F0F0]" style={{ width: s.bw }} />
          </div>
        ))}
      </div>

      {/* Ghost chart section */}
      <div className="px-8 pt-6 pb-0 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="h-3.5 w-28 rounded-sm bg-[#F0F0F0]" />
          <div className="h-7 w-48 rounded-sm bg-[#EEEEEE]" />
        </div>
        <div
          className="flex items-end justify-between gap-2 border border-border bg-[#F8F8F8] px-10 py-4"
          style={{ height: 160 }}
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1 bg-[#EEEEEE]" style={{ height: 30 }} />
          ))}
        </div>
      </div>

      {/* Empty state CTA */}
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="flex flex-col items-center gap-6" style={{ width: 480 }}>

          {/* Icon */}
          <div
            className="flex items-center justify-center border border-border"
            style={{ width: 64, height: 64 }}
          >
            <Radio size={28} className="text-[#CCCCCC]" />
          </div>

          {/* Heading + body */}
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="text-[22px] font-medium" style={LORA}>
              No traces received yet
            </h2>
            <p className="text-[13px] text-[#999999] leading-relaxed" style={{ maxWidth: 420 }}>
              Send your first LLM request through the SDK to see metrics, costs, and latency populate here.
            </p>
          </div>

          {/* Code block */}
          <div className="w-full border border-border">
            <div
              className="flex items-center justify-between bg-[#F8F8F8] border-b border-border px-4"
              style={{ height: 36 }}
            >
              <span className="text-[10px] font-semibold text-[#999999] tracking-[1.5px] uppercase">
                python
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-[10px] font-medium text-[#999999] hover:text-[#555555] transition-colors"
              >
                {copied
                  ? <><CheckCircle2 size={12} className="text-green-500" />Copied</>
                  : <><Copy size={12} />Copy</>
                }
              </button>
            </div>
            <div className="flex flex-col gap-1 p-4">
              {CODE_LINES.map((line, i) => (
                <p key={i} className="text-[12px] text-[#555555] font-mono leading-relaxed" style={{ minHeight: 18 }}>
                  {line}
                </p>
              ))}
            </div>
          </div>

          {/* CTA row */}
          <div className="flex items-center gap-3">
            <a
              href="https://opentelemetry.io/docs/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 bg-[#0066CC] text-white text-[12px] font-semibold px-5 py-2.5 hover:bg-[#0052A3] transition-colors"
            >
              <BookOpen size={14} />
              Read the Docs
            </a>
            <a
              href="#/settings"
              className="flex items-center gap-2 border border-border text-[#555555] text-[12px] font-medium px-5 py-2.5 hover:bg-muted transition-colors"
            >
              <Key size={14} />
              Get API Key
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}

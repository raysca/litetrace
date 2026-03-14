import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Copy, CheckCircle2, Zap, DollarSign, Settings, Database, Activity, Globe } from "lucide-react";

const FEATURES = [
  {
    icon: Globe,
    title: "OTLP Compatible",
    desc: "Works with any OpenTelemetry SDK out of the box",
  },
  {
    icon: DollarSign,
    title: "LLM Cost Tracking",
    desc: "Auto-detects model pricing from span attributes",
  },
  {
    icon: Settings,
    title: "Zero Config",
    desc: "No YAML, no setup — just point and ship",
  },
  {
    icon: Database,
    title: "SQLite by Default",
    desc: "No external database needed, runs anywhere",
  },
  {
    icon: Activity,
    title: "Real-time Traces",
    desc: "Live span tree, timeline, and LLM observation panels",
  },
  {
    icon: Zap,
    title: "Self-Hostable",
    desc: "Single Bun binary, open source",
  },
];

type RunTab = "native" | "docker";

const RUN_TABS: { id: RunTab; label: string }[] = [
  { id: "native", label: "Native (Bun)" },
  { id: "docker", label: "Docker" },
];

const RUN_COMMANDS: Record<RunTab, string> = {
  native: `# Install Bun (if needed)
curl -fsSL https://bun.sh/install | bash

# Clone and run
git clone https://github.com/litetrace/litetrace
cd litetrace
bun install
bun run start

# UI → http://localhost:3000
# OTLP/gRPC → localhost:4317
# OTLP/HTTP → localhost:4318`,
  docker: `# Pull and run
docker run -d \\
  --name litetrace \\
  -p 3000:3000 \\
  -p 4317:4317 \\
  -p 4318:4318 \\
  -v litetrace-data:/data \\
  ghcr.io/litetrace/litetrace:latest

# UI → http://localhost:3000
# OTLP/gRPC → localhost:4317
# OTLP/HTTP → localhost:4318`,
};

type Tab = "openai" | "langchain" | "vercel" | "otlp";

const TABS: { id: Tab; label: string }[] = [
  { id: "openai", label: "OpenAI (Node.js)" },
  { id: "langchain", label: "LangChain (Python)" },
  { id: "vercel", label: "Vercel AI SDK" },
  { id: "otlp", label: "Direct OTLP" },
];

const CODE_SNIPPETS: Record<Tab, { install: string; code: string }> = {
  openai: {
    install: `npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node`,
    code: `import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'grpc://localhost:4317',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

// Your existing OpenAI code works unchanged
import OpenAI from 'openai';
const client = new OpenAI();
const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});`,
  },
  langchain: {
    install: `pip install opentelemetry-sdk opentelemetry-exporter-otlp`,
    code: `from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

# Configure LiteTrace
provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="localhost:4317"))
)
trace.set_tracer_provider(provider)

# Your LangChain code — traces automatically
llm = ChatOpenAI(model="gpt-4o")
response = llm.invoke([HumanMessage(content="Hello!")])`,
  },
  vercel: {
    install: `npm install ai @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-grpc`,
    code: `import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';

new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'grpc://localhost:4317',
  }),
}).start();

// Vercel AI SDK with tracing
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { experimental_telemetry as telemetry } from 'ai';

const result = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Hello!',
  experimental_telemetry: telemetry({
    isEnabled: true,
    functionId: 'my-function',
  }),
});`,
  },
  otlp: {
    install: `# Any language with OTLP support`,
    code: `# gRPC endpoint
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317

# HTTP endpoint
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Example: curl HTTP/JSON
curl -X POST http://localhost:4318/v1/traces \\
  -H "Content-Type: application/json" \\
  -d '{
    "resourceSpans": [{
      "resource": {
        "attributes": [{
          "key": "service.name",
          "value": { "stringValue": "my-service" }
        }]
      },
      "scopeSpans": [{
        "spans": [{
          "traceId": "5b8efff798038103d269b633813fc60c",
          "spanId": "eee19b7ec3c1b174",
          "name": "hello-world",
          "startTimeUnixNano": "1544712660000000000",
          "endTimeUnixNano": "1544712661000000000",
          "kind": 1,
          "status": { "code": 1 }
        }]
      }]
    }]
  }'`,
  },
};

function RunBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="rounded-lg overflow-hidden border border-border/50 bg-zinc-900 relative group">
      <button
        onClick={copy}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300"
      >
        {copied ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
      </button>
      <pre className="px-5 py-4 text-xs font-mono leading-relaxed text-zinc-300 overflow-x-auto">
        <code>{command}</code>
      </pre>
    </div>
  );
}

function CodeBlock({ install, code }: { install: string; code: string }) {
  const [copiedInstall, setCopiedInstall] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const copy = async (text: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch {}
  };

  return (
    <div className="rounded-lg overflow-hidden border border-border/50">
      {/* Install command */}
      <div className="bg-zinc-950 px-4 py-3 flex items-center justify-between gap-3 border-b border-white/5">
        <code className="text-xs font-mono text-zinc-400 flex-1 overflow-x-auto whitespace-nowrap">
          {install}
        </code>
        <button
          onClick={() => copy(install, setCopiedInstall)}
          className="shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {copiedInstall ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
        </button>
      </div>
      {/* Code */}
      <div className="bg-zinc-900 px-4 py-4 relative group">
        <button
          onClick={() => copy(code, setCopiedCode)}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300"
        >
          {copiedCode ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
        </button>
        <pre className="text-xs font-mono leading-relaxed text-zinc-300 overflow-x-auto">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

export function WelcomePage() {
  const navigate = useNavigate();
  const [activeRunTab, setActiveRunTab] = useState<RunTab>("native");
  const [activeTab, setActiveTab] = useState<Tab>("openai");
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const endpoint = "localhost:4317";

  const handleGetStarted = () => {
    localStorage.setItem("litetrace_welcomed", "true");
    navigate({ to: "/" });
  };

  const copyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(endpoint);
      setCopiedEndpoint(true);
      setTimeout(() => setCopiedEndpoint(false), 2000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="min-h-full">
        {/* Nav bar */}
        <div className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm px-8 py-3 flex items-center justify-between">
          <span className="text-sm font-mono font-semibold tracking-tight">LiteTrace</span>
          <button
            onClick={handleGetStarted}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip →
          </button>
        </div>

        <div className="max-w-4xl mx-auto px-8 py-16 space-y-20">
          {/* Hero */}
          <section className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-mono bg-muted border border-border px-3 py-1 rounded-full text-muted-foreground mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              v0.1.0 — Early Access
            </div>
            <h1 className="text-5xl font-bold tracking-tight leading-tight">
              Dead-simple observability
              <br />
              <span className="text-muted-foreground">for LLM apps</span>
            </h1>
            <p className="text-base text-muted-foreground max-w-xl mx-auto">
              Single binary. Zero config. OpenTelemetry compatible.
            </p>
            <div className="pt-4">
              <button
                onClick={handleGetStarted}
                className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Start Exploring →
              </button>
            </div>
          </section>

          {/* Get Running */}
          <section className="space-y-5">
            <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest text-center">
              Get running
            </h2>
            <div className="flex gap-1 border-b border-border">
              {RUN_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveRunTab(tab.id)}
                  className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
                    activeRunTab === tab.id
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <RunBlock command={RUN_COMMANDS[activeRunTab]} />
          </section>

          {/* Features Grid */}
          <section className="space-y-6">
            <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest text-center">
              Everything you need
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="rounded-lg border border-border/60 bg-card p-5 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Icon size={14} className="text-muted-foreground shrink-0" />
                    <h3 className="text-sm font-semibold">{title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Integration Examples */}
          <section className="space-y-5">
            <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest text-center">
              Connect in minutes
            </h2>
            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <CodeBlock {...CODE_SNIPPETS[activeTab]} />
          </section>

          {/* Quick Start CTA */}
          <section className="space-y-5">
            <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest text-center">
              Your endpoint
            </h2>
            <div className="rounded-lg border border-border/60 bg-card p-6 space-y-5 max-w-lg mx-auto">
              {/* Endpoint copy box */}
              <div className="flex items-center gap-3 bg-muted rounded border border-input px-4 py-2.5">
                <code className="flex-1 text-sm font-mono text-foreground">{endpoint}</code>
                <button
                  onClick={copyEndpoint}
                  className={`shrink-0 transition-colors ${
                    copiedEndpoint ? "text-green-500" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {copiedEndpoint ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                </button>
              </div>

              {/* Waiting indicator */}
              <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                Waiting for first trace…
              </div>

              {/* CTA button */}
              <button
                onClick={handleGetStarted}
                className="w-full bg-foreground text-background py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Start Exploring →
              </button>
            </div>
          </section>

          {/* Footer spacer */}
          <div className="pb-8" />
        </div>
      </div>
    </div>
  );
}

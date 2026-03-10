import { useState, useEffect } from "react";
import { Copy, CheckCircle2 } from "lucide-react";

interface WelcomeScreenProps {
  onDismiss: () => void;
  hasTraces: boolean;
}

type Language = "nodejs" | "python" | "go";

const codeSnippets: Record<Language, string> = {
  nodejs: `import { trace } from '@opentelemetry/api';
const tracer = trace.getTracer('my-app');
tracer.startActiveSpan('hello', (span) => { /* your code */ });`,
  python: `from opentelemetry import trace
tracer = trace.get_tracer('my-app')
with tracer.start_as_current_span('hello'):
    # your code here`,
  go: `import "go.opentelemetry.io/otel"
tracer := otel.Tracer("my-app")
ctx, span := tracer.Start(ctx, "hello")
defer span.End()`,
};

const languageLabels: Record<Language, string> = {
  nodejs: "Node.js",
  python: "Python",
  go: "Go",
};

export function WelcomeScreen({ onDismiss, hasTraces }: WelcomeScreenProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("nodejs");
  const [copied, setCopied] = useState(false);
  const endpoint = "localhost:4317";

  // Auto-dismiss when first trace arrives
  useEffect(() => {
    if (hasTraces) {
      onDismiss();
    }
  }, [hasTraces, onDismiss]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(endpoint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <h2 className="text-sm font-mono text-muted-foreground">LiteTrace</h2>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-8 py-12">
          {/* Title Section */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-2">Get up and running</h1>
            <p className="text-lg text-muted-foreground">
              Connect your first trace in 2 minutes
            </p>
          </div>

          {/* Steps Container */}
          <div className="space-y-10">
            {/* Step 1: Language Selection */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">1. Choose your language</h3>
              <div className="flex gap-3">
                {(["nodejs", "python", "go"] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      selectedLanguage === lang
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground border border-input hover:bg-muted/80"
                    }`}
                  >
                    {languageLabels[lang]}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Copy Endpoint */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">2. Copy your endpoint</h3>
              <div className="flex items-center gap-2 bg-muted rounded-md border border-input p-3">
                <code className="flex-1 text-sm font-mono text-foreground">
                  {endpoint}
                </code>
                <button
                  onClick={handleCopy}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
                    copied
                      ? "bg-green-600 text-white"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 size={14} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step 3: Code Snippet */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">3. Send your first trace</h3>
              <div className="bg-slate-900 text-slate-100 rounded-md p-4 overflow-x-auto">
                <pre className="text-xs font-mono leading-relaxed">
                  <code className="text-emerald-400">
                    {codeSnippets[selectedLanguage]}
                  </code>
                </pre>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-3 bg-muted rounded-md border border-input p-3 mt-8">
              <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
              <span className="text-sm text-muted-foreground">
                Server running • {hasTraces ? "Traces detected! Redirecting..." : "Waiting for first trace..."}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-card px-6 py-3 flex items-center justify-center gap-6">
        <a href="#" className="text-xs text-primary hover:underline">
          View docs
        </a>
        <div className="w-px h-4 bg-border" />
        <a href="#/settings" className="text-xs text-primary hover:underline">
          Settings
        </a>
      </div>
    </div>
  );
}

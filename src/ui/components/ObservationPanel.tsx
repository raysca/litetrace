import { useState } from "react";
import type { Observation } from "../hooks/useTrace";
import { cn } from "../../lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function modelBadgeClass(model: string | null, provider: string | null): string {
  const s = ((provider ?? "") + " " + (model ?? "")).toLowerCase();
  if (s.includes("gpt") || s.includes("openai"))       return "bg-status-running-bg text-status-running-text";
  if (s.includes("claude") || s.includes("anthropic")) return "bg-status-warning-bg text-status-warning-text";
  if (s.includes("gemini") || s.includes("google"))    return "bg-status-ok-bg text-status-ok-text";
  return "bg-muted text-muted-foreground";
}

function fmt(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

interface PromptMessage {
  role: string;
  content: string;
}

function parsePrompt(raw: string | null): PromptMessage[] {
  if (!raw) return [];
  try {
    const msgs = JSON.parse(raw);
    if (Array.isArray(msgs)) {
      return msgs.map((m: any) => ({
        role:    String(m.role ?? "user"),
        content: String(m.content ?? ""),
      }));
    }
  } catch {}
  return [{ role: "user", content: raw }];
}

// ─── Collapsible section label ────────────────────────────────────────────────

function SectionLabel({
  label,
  count,
  open,
  onToggle,
}: {
  label: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 w-full text-left group mb-1.5"
    >
      <span className="text-muted-foreground text-[10px] leading-none select-none">
        {open ? "▾" : "▸"}
      </span>
      <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground group-hover:text-foreground transition-colors">
        {label}
      </span>
      {count != null && (
        <span className="text-[10px] text-muted-foreground/50 ml-0.5">
          {count.toLocaleString()} chars
        </span>
      )}
    </button>
  );
}

// ─── Single observation card ──────────────────────────────────────────────────

function ObservationCard({ obs }: { obs: Observation }) {
  const [promptOpen, setPromptOpen]         = useState(true);
  const [completionOpen, setCompletionOpen] = useState(true);

  const messages   = parsePrompt(obs.prompt);
  const completion = obs.completion ?? "";
  const badgeClass = modelBadgeClass(obs.model, obs.provider);

  const promptCharCount = messages.reduce((s, m) => s + m.content.length, 0);

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header row: model + provider + cost */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        {obs.model && (
          <span className={cn("text-xs font-medium px-2.5 py-0.5  shrink-0", badgeClass)}>
            {obs.model}
          </span>
        )}
        {obs.provider && (
          <span className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5  shrink-0">
            {obs.provider}
          </span>
        )}
        {obs.costUsd != null && obs.costUsd > 0 && (
          <span className="ml-auto text-sm font-semibold tabular-nums text-foreground">
            ${obs.costUsd.toFixed(5)}
          </span>
        )}
      </div>

      {/* Token stats */}
      <div className="flex items-center gap-1 px-4 py-2 text-xs text-muted-foreground border-b">
        <span className="tabular-nums">{fmt(obs.promptTokens)} tokens in</span>
        <span className="mx-1 opacity-40">·</span>
        <span className="tabular-nums">{fmt(obs.completionTokens)} tokens out</span>
        <span className="mx-1 opacity-40">·</span>
        <span className="tabular-nums">{fmt(obs.totalTokens)}</span>
      </div>

      {/* Prompt + Completion */}
      <div className="px-4 py-3 flex flex-col gap-3">
        {/* Prompt — broken down per role */}
        {messages.length > 0 && (
          <div>
            <SectionLabel
              label="Prompt"
              count={promptCharCount}
              open={promptOpen}
              onToggle={() => setPromptOpen(o => !o)}
            />
            {promptOpen && (
              <div className="flex flex-col gap-2">
                {messages.map((msg, i) => (
                  <div key={i}>
                    <div className="text-[10px] text-muted-foreground mb-1 font-medium">{msg.role}</div>
                    <div className="text-xs border rounded-md px-2.5 py-2 whitespace-pre-wrap leading-relaxed bg-muted/40 max-h-48 overflow-y-auto">
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Completion */}
        {completion && (
          <div>
            <SectionLabel
              label="Completion"
              count={completion.length}
              open={completionOpen}
              onToggle={() => setCompletionOpen(o => !o)}
            />
            {completionOpen && (
              <div>
                <div className="text-[10px] text-muted-foreground mb-1 font-medium">assistant</div>
                <div className="text-xs border rounded-md px-2.5 py-2 whitespace-pre-wrap leading-relaxed bg-status-ok-bg/50 max-h-64 overflow-y-auto">
                  {completion}
                </div>
              </div>
            )}
          </div>
        )}

        {messages.length === 0 && !completion && (
          <p className="text-xs text-muted-foreground italic py-1">No prompt or completion recorded.</p>
        )}
      </div>
    </div>
  );
}

// ─── Panel root ───────────────────────────────────────────────────────────────

export function ObservationPanel({ observations }: { observations: Observation[] }) {
  if (observations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
        <p className="text-sm font-medium text-muted-foreground">No LLM calls recorded for this trace.</p>
        <p className="text-xs text-muted-foreground/50">
          LLM spans are detected automatically via OpenTelemetry semantic conventions.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">LLM Calls</h2>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 ">
          {observations.length} observation{observations.length !== 1 ? "s" : ""}
        </span>
      </div>
      {observations.map(obs => (
        <ObservationCard key={obs.id} obs={obs} />
      ))}
    </div>
  );
}

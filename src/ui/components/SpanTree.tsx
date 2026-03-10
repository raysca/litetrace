import { useState, useEffect } from "react";
import type { SpanRow, Observation } from "../hooks/useTrace";
import { StatusBadge } from "./StatusBadge";
import { cn } from "../../lib/utils";
import { ChevronDown, ChevronRight, X, ChevronUp } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SpanNode extends SpanRow {
  children: SpanNode[];
  isRoot: boolean;
}

// ─── Tree builder ────────────────────────────────────────────────────────────

function buildTree(spans: SpanRow[]): SpanNode[] {
  const map = new Map<string, SpanNode>();
  for (const s of spans) map.set(s.id, { ...s, children: [], isRoot: false });

  const roots: SpanNode[] = [];
  for (const node of map.values()) {
    if (node.parentSpanId && map.has(node.parentSpanId)) {
      map.get(node.parentSpanId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function sort(node: SpanNode) {
    node.children.sort((a, b) => a.startTime - b.startTime);
    node.children.forEach(sort);
  }
  roots.sort((a, b) => a.startTime - b.startTime);
  roots.forEach(sort);
  if (roots[0]) roots[0].isRoot = true;
  return roots;
}

// ─── Prompt parser ───────────────────────────────────────────────────────────

interface PromptMessage {
  role: string;   // e.g. "system", "user", "assistant"
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
  // Plain string — treat as a single user message
  return [{ role: "user", content: raw }];
}

// ─── Collapsible section ─────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t first:border-t-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 w-full px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground tracking-wider transition-colors"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {title}
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

// ─── Attribute table ─────────────────────────────────────────────────────────

function AttributeTable({ attrs }: { attrs: Record<string, unknown> }) {
  const entries = Object.entries(attrs);
  if (entries.length === 0) return <p className="text-xs text-muted-foreground italic">No attributes</p>;
  return (
    <table className="w-full text-xs">
      <tbody>
        {entries.map(([k, v]) => (
          <tr key={k} className="border-b last:border-b-0">
            <td className="py-1.5 pr-3 text-muted-foreground font-mono align-top w-1/2 break-all">{k}</td>
            <td className="py-1.5 text-foreground font-mono align-top break-all">{String(v)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Span detail panel ───────────────────────────────────────────────────────

function SpanDetailPanel({
  span,
  observation,
  onClose,
}: {
  span: SpanNode;
  observation: Observation | undefined;
  onClose: () => void;
}) {
  const attrs = (() => { try { return JSON.parse(span.attributes || "{}"); } catch { return {}; } })();
  const messages = parsePrompt(observation?.prompt ?? null);
  const completion = observation?.completion ?? null;

  return (
    <div className="flex flex-col h-full overflow-y-auto border-l bg-background">
      {/* Panel header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <span className="text-sm font-semibold truncate flex-1">{span.name}</span>
        {observation && (
          <span className="text-[10px] font-medium bg-status-running-bg text-status-running-text px-2 py-0.5 rounded-full shrink-0">
            LLM
          </span>
        )}
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <X size={14} />
        </button>
      </div>

      {/* Attributes */}
      <Section title="ATTRIBUTES">
        <AttributeTable attrs={attrs} />
        {observation && (
          <table className="w-full text-xs mt-2">
            <tbody>
              {observation.model && (
                <tr className="border-b"><td className="py-1.5 pr-3 text-muted-foreground font-mono">llm.model</td><td className="py-1.5 font-mono">{observation.model}</td></tr>
              )}
              {observation.promptTokens != null && (
                <tr className="border-b"><td className="py-1.5 pr-3 text-muted-foreground font-mono">llm.tokens.prompt_tokens</td><td className="py-1.5 font-mono">{observation.promptTokens.toLocaleString()}</td></tr>
              )}
              {observation.completionTokens != null && (
                <tr className="border-b"><td className="py-1.5 pr-3 text-muted-foreground font-mono">llm.tokens.prompt_completion</td><td className="py-1.5 font-mono">{observation.completionTokens.toLocaleString()}</td></tr>
              )}
              {observation.costUsd != null && (
                <tr className="border-b"><td className="py-1.5 pr-3 text-muted-foreground font-mono">llm.cost_usd</td><td className="py-1.5 font-mono">${observation.costUsd.toFixed(6)}</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Section>

      {/* INPUT — only for LLM spans */}
      {observation && (
        <Section title="INPUT">
          {messages.length > 0 ? (
            <div className="flex flex-col gap-2">
              {messages.map((msg, i) => (
                <div key={i}>
                  <div className="text-[10px] text-muted-foreground mb-1 font-medium">{msg.role}</div>
                  <div className="text-xs border rounded-md px-2.5 py-2 whitespace-pre-wrap leading-relaxed bg-muted/40">
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No prompt recorded</p>
          )}
        </Section>
      )}

      {/* OUTPUT — only for LLM spans */}
      {observation && (
        <Section title="OUTPUT">
          {completion ? (
            <div>
              <div className="text-[10px] text-muted-foreground mb-1 font-medium">assistant</div>
              <div className="text-xs border rounded-md px-2.5 py-2 whitespace-pre-wrap leading-relaxed bg-status-ok-bg/50">
                {completion}
              </div>
              {observation.totalTokens != null && (
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {observation.model} · {observation.totalTokens.toLocaleString()} tokens
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No completion recorded</p>
          )}
        </Section>
      )}

      {/* Status message if any */}
      {span.statusMessage && (
        <Section title="ERROR">
          <p className="text-xs text-status-error font-mono whitespace-pre-wrap">{span.statusMessage}</p>
        </Section>
      )}
    </div>
  );
}

// ─── Span row ─────────────────────────────────────────────────────────────────

interface SpanNodeRowProps {
  node: SpanNode;
  depth: number;
  observation: Observation | undefined;
  onSelect: (span: SpanNode) => void;
  selectedId: string | null;
  forceExpand: boolean;
}

function SpanNodeRow({ node, depth, observation, onSelect, selectedId, forceExpand }: SpanNodeRowProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;
  const isError = node.statusCode === "error";
  const isLlm = !!observation;

  useEffect(() => {
    if (forceExpand) setExpanded(true);
  }, [forceExpand]);

  const tokenCount = observation?.totalTokens;

  return (
    <>
      <tr
        className={cn(
          "cursor-pointer transition-colors group",
          isSelected ? "bg-accent" : "hover:bg-muted/30"
        )}
        onClick={() => onSelect(node)}
      >
        {/* Span Name */}
        <td className="py-2 pl-3 pr-2">
          <div className="flex items-center gap-1" style={{ paddingLeft: depth * 16 }}>
            {hasChildren ? (
              <button
                className="text-muted-foreground hover:text-foreground w-4 h-4 flex items-center justify-center shrink-0 rounded"
                onClick={e => { e.stopPropagation(); setExpanded(x => !x); }}
              >
                {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            ) : (
              <span className="w-4 shrink-0" />
            )}
            <span className={cn(
              "text-xs font-mono truncate max-w-[240px]",
              isError ? "text-status-error" : "text-foreground"
            )}>
              {node.name}
            </span>
            {node.isRoot && (
              <span className="text-[9px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">ROOT</span>
            )}
            {isLlm && (
              <span className="text-[9px] font-medium bg-status-running-bg text-status-running-text px-1.5 py-0.5 rounded shrink-0">LLM</span>
            )}
          </div>
          {isError && node.statusMessage && (
            <div className="ml-5 text-[11px] text-status-error/70 truncate max-w-[260px]" style={{ paddingLeft: depth * 16 }}>
              {node.statusMessage}
            </div>
          )}
        </td>

        {/* Duration */}
        <td className="py-2 px-3 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
          {node.durationMs >= 1000
            ? `${(node.durationMs / 1000).toFixed(2)}s`
            : `${Math.round(node.durationMs)}ms`}
        </td>

        {/* Tokens */}
        <td className="py-2 px-3 text-xs tabular-nums text-muted-foreground">
          {tokenCount != null ? tokenCount.toLocaleString() : "—"}
        </td>

        {/* Status */}
        <td className="py-2 px-3">
          <StatusBadge status={node.statusCode} />
        </td>
      </tr>

      {expanded && node.children.map(child => (
        <SpanNodeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          observation={undefined}
          onSelect={onSelect}
          selectedId={selectedId}
          forceExpand={forceExpand}
        />
      ))}
    </>
  );
}

// ─── SpanTree root ────────────────────────────────────────────────────────────

interface SpanTreeProps {
  spans: SpanRow[];
  observations: Observation[];
  expandAll: boolean;
  expandKey: number;
  onCollapseAll: () => void;
}

export function SpanTree({ spans, observations, expandAll, expandKey }: SpanTreeProps) {
  const [selected, setSelected] = useState<SpanNode | null>(null);
  const tree = buildTree(spans);

  const obsBySpanId = new Map(observations.map(o => [o.spanId, o]));

  function buildObsMap(node: SpanNode): Observation | undefined {
    return obsBySpanId.get(node.id);
  }

  return (
    <div className={cn("flex gap-0 min-h-0", selected ? "divide-x" : "")}>
      {/* Left: span tree */}
      <div className={cn("overflow-auto", selected ? "flex-1" : "w-full")}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              {["SPAN NAME", "DURATION", "TOKENS", "STATUS"].map(h => (
                <th key={h} className="text-left py-2 px-3 text-[11px] font-medium tracking-wide text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tree.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No spans</td>
              </tr>
            ) : tree.map(node => (
              <SpanNodeRow
                key={`${node.id}-${expandKey}`}
                node={node}
                depth={0}
                observation={buildObsMap(node)}
                onSelect={setSelected}
                selectedId={selected?.id ?? null}
                forceExpand={expandAll}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Right: detail panel */}
      {selected && (
        <div className="w-80 xl:w-96 shrink-0">
          <SpanDetailPanel
            span={selected}
            observation={obsBySpanId.get(selected.id)}
            onClose={() => setSelected(null)}
          />
        </div>
      )}
    </div>
  );
}

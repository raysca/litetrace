import { useState, useEffect } from "react";
import type { SpanRow, Observation } from "../hooks/useTrace";
import { StatusBadge } from "./StatusBadge";
import { cn } from "../../lib/utils";
import {
  ChevronDown, ChevronRight, X,
  Cpu, Database, Server, Shield, Zap, Box,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SpanNode extends SpanRow {
  children: SpanNode[];
  isRoot: boolean;
}

// ─── Tree builder ─────────────────────────────────────────────────────────────

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

// ─── Prompt parser ────────────────────────────────────────────────────────────
// Handles three formats:
//   1. { system?: string, messages: [{role, content: string | [{type,text}] }] }
//   2. Array: [{role, content}]
//   3. Plain string fallback

interface PromptMessage {
  role: string;
  content: string;
}

function extractContent(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return raw
      .filter((c: any) => c.type === "text")
      .map((c: any) => String(c.text ?? ""))
      .join("\n");
  }
  return String(raw ?? "");
}

function parsePrompt(raw: string | null): PromptMessage[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    // Format: { system?: string, messages: [...] }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const msgs: PromptMessage[] = [];
      if (parsed.system) msgs.push({ role: "system", content: String(parsed.system) });
      for (const m of Array.isArray(parsed.messages) ? parsed.messages : []) {
        msgs.push({ role: String(m.role ?? "user"), content: extractContent(m.content) });
      }
      return msgs;
    }
    // Array format: [{role, content}]
    if (Array.isArray(parsed)) {
      return parsed.map((m: any) => ({
        role: String(m.role ?? "user"),
        content: extractContent(m.content),
      }));
    }
  } catch {}
  return [{ role: "user", content: raw }];
}

// ─── Role styling ─────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  system:    "text-[#888888]",
  user:      "text-[#0066CC]",
  assistant: "text-[#1A8754]",
};
const ROLE_BOX: Record<string, string> = {
  system:    "bg-[#F8F8F8] border border-[#E5E5E5]",
  user:      "bg-[#F0F7FF] border border-[#C0D8F0]",
  assistant: "bg-[#F0FBF4] border border-[#B2DFC4]",
};

function roleLabelClass(role: string): string { return ROLE_LABEL[role] ?? "text-muted-foreground"; }
function roleBoxClass(role: string): string    { return ROLE_BOX[role]  ?? "bg-muted border border-border"; }

// ─── Span icon ────────────────────────────────────────────────────────────────

function SpanIcon({ span, isLlm }: { span: SpanNode; isLlm: boolean }) {
  const name = span.name.toLowerCase();
  if (span.statusCode === "error") return <Shield size={13} className="text-[#C41E3A] shrink-0" />;
  if (isLlm || name.includes("llm") || name.includes("openai") || name.includes("anthropic") || name.includes("chat")) {
    return <Cpu size={13} className="text-[#0066CC] shrink-0" />;
  }
  if (span.isRoot) return <Zap size={13} className="text-[#0066CC] shrink-0" />;
  if (name.includes("db") || name.includes("database") || name.includes("query") || name.includes("sql")) {
    return <Database size={13} className="text-[#555555] shrink-0" />;
  }
  if (name.includes("cache") || name.includes("redis") || name.includes("server")) {
    return <Server size={13} className="text-[#999999] shrink-0" />;
  }
  return <Box size={13} className="text-[#999999] shrink-0" />;
}

// ─── Collapsible detail section ───────────────────────────────────────────────

function DetailSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full h-9 px-6 text-left hover:bg-muted/30 transition-colors"
      >
        <ChevronDown
          size={12}
          className={cn("text-[#555555] transition-transform shrink-0", !open && "-rotate-90")}
        />
        <span className="text-[10px] font-semibold tracking-[1.5px] text-[#555555]">{title}</span>
      </button>
      {open && children}
    </div>
  );
}

// ─── Span detail panel ────────────────────────────────────────────────────────

const EXCLUDED_ATTR_KEYS = new Set([
  "ai.prompt", "ai.completion",
  "gen_ai.prompt", "gen_ai.completion",
  "llm.prompts", "llm.completions",
  "ai.prompts", "ai.completions",
]);

function SpanDetailPanel({
  span,
  observation,
  onClose,
}: {
  span: SpanNode;
  observation: Observation | undefined;
  onClose: () => void;
}) {
  const rawAttrs = (() => {
    try { return JSON.parse(span.attributes || "{}"); } catch { return {}; }
  })();

  const messages   = parsePrompt(observation?.prompt ?? null);
  const completion = observation?.completion ?? null;
  const isLlm      = !!observation;

  // Build structured attribute rows
  const attrRows: { key: string; value: string; accent?: "green" | "red" }[] = [];
  if (observation) {
    if (observation.model)               attrRows.push({ key: "llm.model",                   value: observation.model });
    if (observation.promptTokens != null) attrRows.push({ key: "llm.token_count.prompt",     value: observation.promptTokens.toLocaleString() });
    if (observation.completionTokens != null) attrRows.push({ key: "llm.token_count.completion", value: observation.completionTokens.toLocaleString() });
    if (observation.costUsd != null)     attrRows.push({ key: "llm.cost_usd",                value: `$${observation.costUsd.toFixed(6)}` });
  }
  const observationKeys = new Set(["llm.model", "llm.token_count.prompt", "llm.token_count.completion", "llm.cost_usd"]);
  for (const [k, v] of Object.entries(rawAttrs)) {
    if (EXCLUDED_ATTR_KEYS.has(k)) continue;
    if (observation && observationKeys.has(k)) continue;
    const str = typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
    const accent = (k.includes("finish_reason") && str === "stop") ? "green" as const
                 : (k.includes("error") || k.includes("status") && str === "error") ? "red" as const
                 : undefined;
    attrRows.push({ key: k, value: str, accent });
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      {/* Header */}
      <div
        className="flex items-center justify-between gap-2 px-6 bg-[#F8F8F8] border-b shrink-0"
        style={{ height: 48 }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isLlm
            ? <Cpu size={14} className="text-[#0066CC] shrink-0" />
            : <Box size={14} className="text-[#999999] shrink-0" />
          }
          <span className="text-[13px] font-semibold truncate text-[#111111]">{span.name}</span>
          {isLlm && (
            <span className="bg-[#0066CC12] text-[#0066CC] text-[10px] font-semibold px-2 py-0.5 shrink-0">
              LLM
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-[#999999] hover:text-foreground transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* ATTRIBUTES */}
      <DetailSection title="ATTRIBUTES">
        {attrRows.length === 0 ? (
          <p className="px-6 pb-3 text-xs text-muted-foreground italic">No attributes</p>
        ) : (
          <div className="pb-3">
            {attrRows.map((row, i) => (
              <div
                key={row.key}
                className={cn(
                  "flex items-center px-6",
                  i % 2 === 1 ? "bg-[#F8F8F8]" : ""
                )}
                style={{ height: 32 }}
              >
                <span className="w-[180px] shrink-0 text-[11px] font-medium text-[#555555] truncate">
                  {row.key}
                </span>
                <span className={cn(
                  "text-[11px] truncate",
                  row.accent === "green" ? "text-[#1A8754]"
                  : row.accent === "red" ? "text-[#C41E3A]"
                  : "text-[#111111]"
                )}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      {/* INPUT */}
      {isLlm && (
        <DetailSection title="INPUT">
          {messages.length > 0 ? (
            <div className="px-6 pb-4 flex flex-col gap-3">
              {messages.map((msg, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <span className={cn(
                    "text-[10px] font-semibold tracking-[1px] uppercase",
                    roleLabelClass(msg.role)
                  )}>
                    {msg.role}
                  </span>
                  <div className={cn(
                    "text-[11px] px-3 py-2.5 whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-48",
                    roleBoxClass(msg.role)
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-6 pb-3 text-xs text-muted-foreground italic">No prompt recorded</p>
          )}
        </DetailSection>
      )}

      {/* OUTPUT */}
      {isLlm && (
        <DetailSection title="OUTPUT">
          {completion ? (
            <div className="px-6 pb-4 flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold tracking-[1px] uppercase text-[#1A8754]">
                assistant
              </span>
              <div className="text-[11px] px-3 py-2.5 whitespace-pre-wrap leading-relaxed border border-[#B2DFC4] bg-[#F0FBF4] overflow-y-auto max-h-64">
                {completion}
              </div>
              <div className="flex items-center gap-4 text-[10px] text-[#888888] mt-0.5">
                {observation?.totalTokens != null && (
                  <span>{observation.totalTokens.toLocaleString()} tokens</span>
                )}
                {observation?.model && <span>{observation.model}</span>}
              </div>
            </div>
          ) : (
            <p className="px-6 pb-3 text-xs text-muted-foreground italic">No completion recorded</p>
          )}
        </DetailSection>
      )}

      {/* ERROR */}
      {span.statusMessage && (
        <DetailSection title="ERROR" defaultOpen={true}>
          <p className="px-6 pb-3 text-xs text-[#C41E3A] font-mono whitespace-pre-wrap">
            {span.statusMessage}
          </p>
        </DetailSection>
      )}
    </div>
  );
}

// ─── Span row ─────────────────────────────────────────────────────────────────

interface SpanNodeRowProps {
  node: SpanNode;
  depth: number;
  obsBySpanId: Map<string, Observation>;
  onSelect: (span: SpanNode) => void;
  selectedId: string | null;
  forceExpand: boolean;
}

function SpanNodeRow({
  node, depth, obsBySpanId, onSelect, selectedId, forceExpand,
}: SpanNodeRowProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isSelected  = selectedId === node.id;
  const isError     = node.statusCode === "error";
  const observation = obsBySpanId.get(node.id);
  const isLlm       = !!observation;
  const tokenCount  = observation?.totalTokens;

  useEffect(() => {
    if (forceExpand) setExpanded(true);
  }, [forceExpand]);

  return (
    <>
      <tr
        className={cn(
          "cursor-pointer transition-colors border-b group",
          isSelected
            ? "bg-[#0066CC08]"
            : isError
              ? "bg-[#FFF8F8] hover:bg-[#FFF0F0]"
              : "hover:bg-muted/30"
        )}
        onClick={() => onSelect(node)}
      >
        {/* Span Name */}
        <td className="py-0 pr-2" style={{ height: node.isRoot ? 48 : 44 }}>
          <div
            className="flex items-center gap-1.5 h-full"
            style={{ paddingLeft: 24 + depth * 16 }}
          >
            {/* Expand/collapse toggle */}
            {hasChildren ? (
              <button
                className="text-[#555555] hover:text-foreground w-[14px] h-[14px] flex items-center justify-center shrink-0"
                onClick={e => { e.stopPropagation(); setExpanded(x => !x); }}
              >
                {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            ) : (
              <span className="w-[14px] shrink-0" />
            )}

            <SpanIcon span={node} isLlm={isLlm} />

            <div className="flex flex-col justify-center gap-0.5 min-w-0">
              <span className={cn(
                "text-[13px] font-medium truncate max-w-[220px]",
                isError ? "text-[#C41E3A]" : "text-[#111111]"
              )}>
                {node.name}
              </span>
              {isError && node.statusMessage && (
                <span className="text-[11px] text-[#C41E3A]/70 truncate max-w-[220px]">
                  {node.statusMessage}
                </span>
              )}
            </div>

            {node.isRoot && (
              <span className="text-[9px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 shrink-0">
                ROOT
              </span>
            )}
            {isLlm && (
              <span className="text-[9px] font-semibold bg-[#0066CC12] text-[#0066CC] px-1.5 py-0.5 shrink-0">
                LLM
              </span>
            )}
          </div>
        </td>

        {/* Duration */}
        <td className="py-0 px-3 text-[13px] tabular-nums font-medium text-[#111111] whitespace-nowrap"
            style={{ height: 44 }}>
          {node.durationMs >= 1000
            ? `${(node.durationMs / 1000).toFixed(2)}s`
            : `${Math.round(node.durationMs)}ms`}
        </td>

        {/* Tokens */}
        <td className="py-0 px-3 text-[13px] tabular-nums font-medium whitespace-nowrap"
            style={{ height: 44 }}>
          {tokenCount != null
            ? <span className="text-[#111111]">{tokenCount.toLocaleString()}</span>
            : <span className="text-[#CCCCCC]">—</span>
          }
        </td>

        {/* Status */}
        <td className="py-0 px-3" style={{ height: 44 }}>
          <StatusBadge status={node.statusCode} />
        </td>
      </tr>

      {expanded && node.children.map(child => (
        <SpanNodeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          obsBySpanId={obsBySpanId}
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
  const tree        = buildTree(spans);
  const obsBySpanId = new Map(observations.map(o => [o.spanId, o]));

  return (
    <div className={cn("flex min-h-0", selected ? "divide-x" : "")}>
      {/* Left: span tree */}
      <div className={cn("overflow-auto", selected ? "flex-1 min-w-0" : "w-full")}>
        <table className="w-full">
          <thead>
            <tr className="bg-[#F8F8F8] border-b">
              {[
                { label: "SPAN NAME" },
                { label: "DURATION", w: "w-[100px]" },
                { label: "TOKENS",   w: "w-[100px]" },
                { label: "STATUS",   w: "w-[100px]" },
              ].map(h => (
                <th
                  key={h.label}
                  className={cn(
                    "text-left h-9 px-3 text-[10px] font-semibold tracking-[1.5px] text-[#999999]",
                    h.w,
                    h.label === "SPAN NAME" && "pl-6"
                  )}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tree.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  No spans
                </td>
              </tr>
            ) : tree.map(node => (
              <SpanNodeRow
                key={`${node.id}-${expandKey}`}
                node={node}
                depth={0}
                obsBySpanId={obsBySpanId}
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
        <div className="w-[420px] xl:w-[480px] shrink-0">
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

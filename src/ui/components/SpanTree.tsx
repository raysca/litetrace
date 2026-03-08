import { useState } from "react";
import type { SpanRow } from "../hooks/useTrace";
import { StatusBadge } from "./StatusBadge";
import { cn } from "../../lib/utils";

interface SpanNode extends SpanRow {
  children: SpanNode[];
}

function buildTree(spans: SpanRow[]): SpanNode[] {
  const map = new Map<string, SpanNode>();
  for (const s of spans) map.set(s.id, { ...s, children: [] });

  const roots: SpanNode[] = [];
  for (const node of map.values()) {
    if (node.parentSpanId && map.has(node.parentSpanId)) {
      map.get(node.parentSpanId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by startTime
  function sortChildren(node: SpanNode) {
    node.children.sort((a, b) => a.startTime - b.startTime);
    node.children.forEach(sortChildren);
  }
  roots.forEach(sortChildren);
  roots.sort((a, b) => a.startTime - b.startTime);

  return roots;
}

interface SpanNodeRowProps {
  node: SpanNode;
  depth: number;
  onSelect: (span: SpanNode) => void;
  selected: string | null;
}

function SpanNodeRow({ node, depth, onSelect, selected }: SpanNodeRowProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <>
      <tr
        className={cn(
          "cursor-pointer hover:bg-muted/40 transition-colors",
          selected === node.id && "bg-muted"
        )}
        onClick={() => onSelect(node)}
      >
        <td className="py-1.5 pl-2 pr-4">
          <div className="flex items-center gap-1" style={{ paddingLeft: depth * 20 }}>
            {hasChildren ? (
              <button
                className="text-xs text-muted-foreground hover:text-foreground w-4 shrink-0"
                onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}
              >
                {expanded ? "▾" : "▸"}
              </button>
            ) : (
              <span className="w-4 shrink-0" />
            )}
            <span className="font-mono text-sm truncate max-w-xs">{node.name}</span>
          </div>
        </td>
        <td className="py-1.5 px-2 text-sm text-muted-foreground">{node.durationMs.toFixed(2)} ms</td>
        <td className="py-1.5 px-2"><StatusBadge status={node.statusCode} /></td>
        <td className="py-1.5 px-2 text-xs text-muted-foreground font-mono truncate max-w-xs">
          {node.id.slice(0, 16)}
        </td>
      </tr>
      {expanded && node.children.map(child => (
        <SpanNodeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          onSelect={onSelect}
          selected={selected}
        />
      ))}
    </>
  );
}

interface SpanTreeProps {
  spans: SpanRow[];
}

export function SpanTree({ spans }: SpanTreeProps) {
  const [selected, setSelected] = useState<SpanNode | null>(null);
  const tree = buildTree(spans);

  return (
    <div className="flex gap-4">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b">
              <th className="text-left py-2 pl-2 font-medium">Name</th>
              <th className="text-left py-2 px-2 font-medium">Duration</th>
              <th className="text-left py-2 px-2 font-medium">Status</th>
              <th className="text-left py-2 px-2 font-medium">Span ID</th>
            </tr>
          </thead>
          <tbody>
            {tree.map(node => (
              <SpanNodeRow
                key={node.id}
                node={node}
                depth={0}
                onSelect={setSelected}
                selected={selected?.id ?? null}
              />
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="w-80 shrink-0 border-l pl-4">
          <h3 className="font-semibold mb-2 text-sm">{selected.name}</h3>
          <dl className="text-xs space-y-1">
            <div><dt className="text-muted-foreground">Span ID</dt><dd className="font-mono break-all">{selected.id}</dd></div>
            <div><dt className="text-muted-foreground">Duration</dt><dd>{selected.durationMs.toFixed(3)} ms</dd></div>
            <div><dt className="text-muted-foreground">Status</dt><dd><StatusBadge status={selected.statusCode} /></dd></div>
            {selected.statusMessage && (
              <div><dt className="text-muted-foreground">Message</dt><dd>{selected.statusMessage}</dd></div>
            )}
            <div>
              <dt className="text-muted-foreground mb-1">Attributes</dt>
              <dd>
                <pre className="bg-muted rounded p-2 text-xs overflow-auto max-h-48 whitespace-pre-wrap">
                  {JSON.stringify(JSON.parse(selected.attributes || "{}"), null, 2)}
                </pre>
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

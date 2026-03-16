import { useState } from "react";
import { Plus, Trash2, Copy, Check, Key } from "lucide-react";
import { useApiKeys } from "../hooks/useApiKeys";
import type { NewKeyResult } from "../hooks/useApiKeys";
import { cn } from "../../lib/utils";

function formatDate(ms: number | null): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm">
      <span className="flex-1 truncate select-all">{value}</span>
      <button onClick={handleCopy} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

export function ApiKeys() {
  const { keys, loading, createKey, deleteKey } = useApiKeys();
  const [newName, setNewName]             = useState("");
  const [creating, setCreating]           = useState(false);
  const [revealed, setRevealed]           = useState<NewKeyResult | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formError, setFormError]         = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) { setFormError("Key name is required"); return; }
    setCreating(true);
    setFormError(null);
    try {
      const result = await createKey(name);
      setRevealed(result);
      setNewName("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteKey(id);
    setDeleteConfirm(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-semibold">API Keys</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Keys authenticate OTLP ingestion on ports 4317 and 4318.
          When no keys exist, all traffic is allowed.
        </p>
      </div>

      {/* Revealed key banner — shown once on creation */}
      {revealed && (
        <div className="rounded-md border border-green-500/30 bg-green-500/5 p-4 flex flex-col gap-2">
          <p className="text-xs font-medium text-green-700 dark:text-green-400">
            Key created — copy it now. It will not be shown again.
          </p>
          <CopyField value={revealed.key} />
          <button
            onClick={() => setRevealed(null)}
            className="self-end text-xs text-muted-foreground hover:text-foreground"
          >
            I've copied it
          </button>
        </div>
      )}

      {/* Create form */}
      <form onSubmit={handleCreate} className="flex items-end gap-2">
        <div className="flex flex-col gap-1 flex-1 max-w-xs">
          <label className="text-xs font-medium text-muted-foreground">Key name</label>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="e.g. production"
            className="h-8 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {formError && <p className="text-xs text-destructive">{formError}</p>}
        </div>
        <button
          type="submit"
          disabled={creating}
          className={cn(
            "flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium transition-opacity",
            creating && "opacity-50 pointer-events-none"
          )}
        >
          <Plus size={13} />
          {creating ? "Creating…" : "Create key"}
        </button>
      </form>

      {/* Keys table */}
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              {["NAME", "PREFIX", "LAST USED", "CREATED"].map(h => (
                <th key={h} className="text-left py-2.5 px-3 text-[11px] font-medium tracking-wide text-muted-foreground">
                  {h}
                </th>
              ))}
              <th className="py-2.5 px-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Loading…</td>
              </tr>
            )}
            {!loading && keys.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  <div className="flex flex-col items-center gap-1">
                    <Key size={16} className="text-muted-foreground/50" />
                    <span>No keys yet — all OTLP traffic is allowed</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && keys.map(k => (
              <tr key={k.id} className="border-t">
                <td className="py-2.5 px-3 font-medium">{k.name}</td>
                <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">{k.prefix}…</td>
                <td className="py-2.5 px-3 text-xs text-muted-foreground tabular-nums">{formatDate(k.lastUsedAt)}</td>
                <td className="py-2.5 px-3 text-xs text-muted-foreground tabular-nums">{formatDate(k.createdAt)}</td>
                <td className="py-2.5 px-3 text-right">
                  {deleteConfirm === k.id ? (
                    <span className="flex items-center justify-end gap-2 text-xs">
                      <span className="text-muted-foreground">Revoke?</span>
                      <button onClick={() => handleDelete(k.id)} className="text-destructive font-medium hover:underline">Yes</button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-muted-foreground hover:underline">No</button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(k.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

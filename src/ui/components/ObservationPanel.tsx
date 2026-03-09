interface Observation {
  id: string;
  spanId: string;
  model: string | null;
  provider: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  costUsd: number | null;
  prompt: string | null;
  completion: string | null;
}

interface Props { observations: Observation[] }

export function ObservationPanel({ observations }: Props) {
  if (observations.length === 0) {
    return <p className="text-muted-foreground text-sm">No LLM calls recorded for this trace.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {observations.map(obs => (
        <div key={obs.id} className="rounded-lg border p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {obs.model && (
              <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{obs.model}</span>
            )}
            {obs.provider && (
              <span className="text-xs text-muted-foreground">{obs.provider}</span>
            )}
            <div className="ml-auto flex gap-4 text-xs text-muted-foreground">
              {obs.promptTokens != null && <span>in: {obs.promptTokens.toLocaleString()} tokens</span>}
              {obs.completionTokens != null && <span>out: {obs.completionTokens.toLocaleString()} tokens</span>}
              {obs.costUsd != null && (
                <span className="text-green-500 font-medium">${obs.costUsd.toFixed(6)}</span>
              )}
            </div>
          </div>

          {obs.prompt && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Prompt</div>
              <pre className="text-xs bg-muted rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
                {(() => { try { return JSON.stringify(JSON.parse(obs.prompt), null, 2); } catch { return obs.prompt; } })()}
              </pre>
            </div>
          )}

          {obs.completion && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Completion</div>
              <pre className="text-xs bg-muted rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
                {obs.completion}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

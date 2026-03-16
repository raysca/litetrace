import { useState, useEffect, useCallback } from "react";

export interface ApiKey {
  id:         string;
  name:       string;
  prefix:     string;
  lastUsedAt: number | null;
  createdAt:  number;
}

export interface NewKeyResult extends ApiKey {
  key: string;   // full key — only returned on creation
}

export function useApiKeys() {
  const [keys, setKeys]       = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/keys");
      if (!res.ok) throw new Error("Failed to load keys");
      setKeys(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const createKey = useCallback(async (name: string): Promise<NewKeyResult> => {
    const res = await fetch("/api/keys", {
      method:  "POST",
      headers: { "content-type": "application/json" },
      body:    JSON.stringify({ name }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error((json as any)?.error?.message ?? "Failed to create key");
    }
    const created: NewKeyResult = await res.json();
    setKeys(prev => [
      ...prev,
      { id: created.id, name: created.name, prefix: created.prefix,
        lastUsedAt: created.lastUsedAt, createdAt: created.createdAt },
    ]);
    return created;
  }, []);

  const deleteKey = useCallback(async (id: string) => {
    const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete key");
    setKeys(prev => prev.filter(k => k.id !== id));
  }, []);

  return { keys, loading, error, createKey, deleteKey };
}

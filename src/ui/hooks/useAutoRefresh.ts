import { useState, useEffect, useLayoutEffect, useRef } from "react";

export const INTERVALS = [
  { label: "Off",  value: null },
  { label: "5s",   value: 5_000 },
  { label: "10s",  value: 10_000 },
  { label: "30s",  value: 30_000 },
  { label: "1m",   value: 60_000 },
  { label: "5m",   value: 300_000 },
  { label: "15m",  value: 900_000 },
  { label: "30m",  value: 1_800_000 },
];

export function useAutoRefresh(onRefresh: () => void, storageKey?: string) {
  // Stable callback ref — avoids restarting interval on every render
  const cbRef = useRef(onRefresh);
  useLayoutEffect(() => { cbRef.current = onRefresh; });

  const [intervalMs, setIntervalMs] = useState<number | null>(() => {
    if (!storageKey) return null;
    const v = localStorage.getItem(storageKey);
    return v ? Number(v) : null;
  });

  useEffect(() => {
    if (!intervalMs) return;
    const id = setInterval(() => cbRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  function select(ms: number | null) {
    setIntervalMs(ms);
    if (storageKey) {
      ms == null
        ? localStorage.removeItem(storageKey)
        : localStorage.setItem(storageKey, String(ms));
    }
  }

  return { intervalMs, select, INTERVALS };
}

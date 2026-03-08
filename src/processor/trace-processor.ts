import type { NormalizedSpan } from "./types";
import { processSpans } from "./span-processor";
import { upsertSpans } from "../storage/trace-repository";
import { getDb } from "../db/client";
import { config } from "../config";

export class TraceProcessor {
  private queue: NormalizedSpan[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;

  constructor() {
    this.batchSize = config.processor.batch_size;
    this.flushIntervalMs = config.processor.flush_interval_ms;
  }

  start() {
    this.flushTimer = setInterval(() => this.flush(), this.flushIntervalMs);
  }

  stop() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    return this.flush();
  }

  enqueue(spans: NormalizedSpan[]) {
    const processed = processSpans(spans);
    this.queue.push(...processed);

    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }

  private async flush() {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.queue.length);
    try {
      const db = getDb();
      await upsertSpans(db, batch);
    } catch (err) {
      console.error("[TraceProcessor] flush error:", err);
      // Re-queue on error (simple retry — no infinite loop guard for MVP)
      this.queue.unshift(...batch);
    }
  }
}

// Singleton
let _processor: TraceProcessor | null = null;
export function getProcessor(): TraceProcessor {
  if (!_processor) {
    _processor = new TraceProcessor();
  }
  return _processor;
}

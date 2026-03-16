#!/usr/bin/env bun
/**
 * LiteTrace OTLP/HTTP ingestion benchmark
 *
 * Usage:
 *   bun scripts/bench.ts
 *   BENCH_TARGET=http://localhost:4318/v1/traces bun scripts/bench.ts
 *   BENCH_API_KEY=lt_abc123 bun scripts/bench.ts
 *   SPANS_PER_REQ=20 bun scripts/bench.ts
 */

const TARGET = process.env.BENCH_TARGET ?? "http://localhost:4318/v1/traces";
const API_KEY = process.env.BENCH_API_KEY ?? null;
const SPANS_PER_REQ = parseInt(process.env.SPANS_PER_REQ ?? "10", 10);

// ── Payload generation ────────────────────────────────────────────────────────

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
}

const DB_STATEMENTS = [
  "SELECT * FROM users WHERE id = ?",
  "INSERT INTO events (type, payload) VALUES (?, ?)",
  "UPDATE sessions SET last_active = ? WHERE token = ?",
  "SELECT count(*) FROM traces WHERE created_at > ?",
];

function makePayload(spansPerReq: number): string {
  const traceId = randomHex(16);
  const rootSpanId = randomHex(8);
  const startNs = BigInt(Date.now()) * 1_000_000n;

  const spans = [];

  // Root HTTP span
  spans.push({
    traceId,
    spanId: rootSpanId,
    name: "HTTP POST /api/ingest",
    kind: 2, // SERVER
    startTimeUnixNano: String(startNs),
    endTimeUnixNano: String(startNs + 5_000_000n),
    attributes: [
      { key: "http.method", value: { stringValue: "POST" } },
      { key: "http.url", value: { stringValue: "http://app.internal/api/ingest" } },
      { key: "http.status_code", value: { intValue: 200 } },
    ],
    status: { code: 1 },
  });

  // Child spans (DB calls, cache lookups, etc.)
  for (let i = 1; i < spansPerReq; i++) {
    const isDb = i % 3 !== 0;
    const childStartNs = startNs + BigInt(i) * 200_000n;
    spans.push({
      traceId,
      spanId: randomHex(8),
      parentSpanId: rootSpanId,
      name: isDb ? "db.query" : "cache.get",
      kind: 3, // CLIENT
      startTimeUnixNano: String(childStartNs),
      endTimeUnixNano: String(childStartNs + 800_000n),
      attributes: isDb
        ? [
            { key: "db.system", value: { stringValue: "postgresql" } },
            {
              key: "db.statement",
              value: { stringValue: DB_STATEMENTS[i % DB_STATEMENTS.length] },
            },
          ]
        : [
            { key: "cache.system", value: { stringValue: "redis" } },
            { key: "cache.key", value: { stringValue: `session:${randomHex(4)}` } },
          ],
      status: { code: 1 },
    });
  }

  return JSON.stringify({
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: "service.name", value: { stringValue: "benchmark-service" } },
            { key: "service.version", value: { stringValue: "1.0.0" } },
          ],
        },
        scopeSpans: [
          {
            scope: { name: "benchmark", version: "1.0.0" },
            spans,
          },
        ],
      },
    ],
  });
}

// ── Stats collection ──────────────────────────────────────────────────────────

interface RunResult {
  concurrency: number;
  durationMs: number;
  totalRequests: number;
  totalSpans: number;
  errors: number;
  latencies: number[]; // ms, sorted
}

async function runWorkers(
  concurrency: number,
  durationMs: number,
  spansPerReq: number
): Promise<RunResult> {
  const latencies: number[] = [];
  let totalRequests = 0;
  let errors = 0;
  const deadline = Date.now() + durationMs;

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (API_KEY) headers["authorization"] = `Bearer ${API_KEY}`;

  async function worker() {
    while (Date.now() < deadline) {
      const body = makePayload(spansPerReq);
      const t0 = performance.now();
      try {
        const res = await fetch(TARGET, {
          method: "POST",
          headers,
          body,
        });
        const latMs = performance.now() - t0;
        latencies.push(latMs);
        totalRequests++;
        if (!res.ok) errors++;
      } catch {
        errors++;
        totalRequests++;
        latencies.push(performance.now() - t0);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  latencies.sort((a, b) => a - b);

  return {
    concurrency,
    durationMs,
    totalRequests,
    totalSpans: totalRequests * spansPerReq,
    errors,
    latencies,
  };
}

// ── Percentile helpers ────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function fmtMs(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  return `${ms.toFixed(1)}ms`;
}

function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}

function fmtPct(errors: number, total: number): string {
  if (total === 0) return "0.0%";
  return `${((errors / total) * 100).toFixed(1)}%`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Stage {
  concurrency: number;
  durationMs: number;
  label: string;
}

const STAGES: Stage[] = [
  { label: "warm-up", concurrency: 1, durationMs: 5_000 },
  { label: "low", concurrency: 5, durationMs: 15_000 },
  { label: "medium", concurrency: 20, durationMs: 30_000 },
  { label: "high", concurrency: 50, durationMs: 30_000 },
  { label: "burst", concurrency: 100, durationMs: 15_000 },
];

async function main() {
  console.log(`\nLiteTrace Benchmark — OTLP/HTTP (${TARGET})`);
  console.log(`Spans per request: ${SPANS_PER_REQ}`);
  if (API_KEY) console.log(`Auth: Bearer token provided`);
  console.log();

  // Verify target is reachable
  try {
    const probe = await fetch(TARGET, {
      method: "POST",
      headers: { "content-type": "application/json", ...(API_KEY ? { authorization: `Bearer ${API_KEY}` } : {}) },
      body: makePayload(1),
      signal: AbortSignal.timeout(5000),
    });
    if (probe.status === 401) {
      console.error(
        "✗ Server returned 401 Unauthorized. Set BENCH_API_KEY=<key> and retry."
      );
      process.exit(1);
    }
  } catch (err) {
    console.error(`✗ Could not reach ${TARGET}:`);
    console.error(`  ${err}`);
    console.error("\nMake sure the server is running:");
    console.error("  bun run start &");
    console.error("  sleep 2 && bun scripts/bench.ts");
    process.exit(1);
  }

  const results: RunResult[] = [];

  for (const stage of STAGES) {
    process.stdout.write(
      `  Running ${stage.label.padEnd(8)} (${String(stage.concurrency).padStart(3)} workers, ${stage.durationMs / 1000}s)...`
    );
    const result = await runWorkers(stage.concurrency, stage.durationMs, SPANS_PER_REQ);
    results.push(result);
    const rps = Math.round(result.totalRequests / (result.durationMs / 1000));
    process.stdout.write(` ${fmtNum(rps)} req/s\n`);
  }

  // Print summary table (skip warm-up row)
  const measured = results.slice(1);

  const col = {
    concurrency: 11,
    rps: 9,
    sps: 10,
    p50: 8,
    p95: 8,
    p99: 8,
    errors: 7,
  };

  const pad = (s: string | number, w: number, right = true) =>
    right ? String(s).padStart(w) : String(s).padEnd(w);

  console.log();
  console.log(
    `${"Concurrency".padStart(col.concurrency)} │ ${"Req/s".padStart(col.rps)} │ ${"Spans/s".padStart(col.sps)} │ ${"p50".padStart(col.p50)} │ ${"p95".padStart(col.p95)} │ ${"p99".padStart(col.p99)} │ ${"Errors".padStart(col.errors)}`
  );
  console.log("─".repeat(col.concurrency + col.rps + col.sps + col.p50 + col.p95 + col.p99 + col.errors + 18));

  for (const r of measured) {
    const durationSec = r.durationMs / 1000;
    const rps = Math.round(r.totalRequests / durationSec);
    const sps = Math.round(r.totalSpans / durationSec);
    const p50 = percentile(r.latencies, 50);
    const p95 = percentile(r.latencies, 95);
    const p99 = percentile(r.latencies, 99);

    console.log(
      `${pad(r.concurrency, col.concurrency)} │ ${pad(fmtNum(rps), col.rps)} │ ${pad(fmtNum(sps), col.sps)} │ ${pad(fmtMs(p50), col.p50)} │ ${pad(fmtMs(p95), col.p95)} │ ${pad(fmtMs(p99), col.p99)} │ ${pad(fmtPct(r.errors, r.totalRequests), col.errors)}`
    );
  }

  // Headline stat
  const best = measured.reduce((a, b) =>
    b.totalSpans / b.durationMs > a.totalSpans / a.durationMs ? b : a
  );
  const peakSps = Math.round(best.totalSpans / (best.durationMs / 1000));
  console.log();
  console.log(`Peak throughput: ${fmtNum(peakSps)} spans/s at ${best.concurrency} concurrent workers`);
  console.log();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

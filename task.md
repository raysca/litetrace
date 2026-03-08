# MVP Task List

## Phase 1.1 — Project Foundation

- [ ] Initialize `package.json` with Bun, TypeScript, and Drizzle dependencies
- [ ] Set up `tsconfig.json`
- [ ] Create project directory structure (`src/`, `__tests__/`, `src/db/`, `src/processor/`, `src/api/`, `src/ui/`)
- [ ] Define Drizzle schema for `traces`, `spans`, `observations`, `metrics` tables
- [ ] Write and run initial SQLite migration via Drizzle
- [ ] Add basic `bun run dev` and `bun run start` scripts

---

## Phase 1.2 — OTLP/HTTP Receiver

- [ ] Create `Bun.serve()` entry point on port 3000 (Web UI) and 4318 (OTLP/HTTP)
- [ ] Implement `POST /v1/traces` endpoint accepting OTLP JSON payload
- [ ] Parse `ResourceSpans` → `ScopeSpans` → `Span` from OTLP JSON format
- [ ] Implement `POST /v1/traces` endpoint accepting OTLP Protobuf payload
- [ ] Return correct `ExportTraceServiceResponse` on success
- [ ] Handle and log malformed payloads without crashing

---

## Phase 1.3 — OTLP/gRPC Receiver

- [ ] Add gRPC server on port 4317 (using `@grpc/grpc-js` or Bun-compatible alternative)
- [ ] Implement `TraceService/Export` RPC method
- [ ] Support both Protobuf and JSON encoding over gRPC
- [ ] Ensure gRPC and HTTP receivers share the same trace processor pipeline

---

## Phase 1.4 — Trace Processor

- [ ] Implement span ingestion pipeline: parse raw OTLP → normalize → persist
- [ ] Build span hierarchy (parent/child via `parent_span_id`)
- [ ] Calculate `duration` from `start_time` and `end_time`
- [ ] Sanitize and coerce span attributes to consistent types
- [ ] Upsert `trace` record on first span received for a given `trace_id`
- [ ] Batch inserts for performance (async queue or micro-batch)

---

## Phase 1.5 — Storage Layer

- [ ] Implement `TraceRepository`: insert trace, insert span, get trace by ID, list traces
- [ ] Implement pagination (`limit` / `offset`) on trace list queries
- [ ] Implement time-based filtering (`start_time` range) on trace list
- [ ] Implement attribute-based filtering (JSON field queries)
- [ ] Write unit tests for repository CRUD operations
- [ ] Write unit tests for query builder logic

---

## Phase 1.6 — Query REST API

- [ ] `GET /api/traces` — paginated list with optional filters (`limit`, `offset`, `from`, `to`, `service`)
- [ ] `GET /api/traces/:traceId` — full trace with all spans
- [ ] `GET /api/spans/:spanId` — single span detail
- [ ] Return consistent JSON error responses (4xx/5xx)
- [ ] Write API contract tests for each endpoint

---

## Phase 1.7 — Minimal Web UI

- [ ] Set up `index.html` + `frontend.tsx` served via `Bun.serve()` route
- [ ] Implement trace list page: table of recent traces (name, service, duration, status, timestamp)
- [ ] Implement trace detail page: span timeline/tree view
- [ ] Add basic filtering UI (time range, service name)
- [ ] Dark mode default styling
- [ ] Error and empty states

---

## Phase 1.8 — Developer Experience

- [ ] Print startup banner showing all active ports and DB path
- [ ] Graceful shutdown (flush in-flight spans before exit)
- [ ] Basic `config.yaml` support (ports, DB path, retention)
- [ ] Helpful error messages for common misconfigurations (port in use, bad DB path)

---

## Phase 1.9 — Testing

- [ ] Unit tests: span processor (hierarchy, duration, attribute sanitization)
- [ ] Unit tests: OTLP converter (JSON + Protobuf parsing)
- [ ] Integration tests: full ingest → store → query round trip over HTTP
- [ ] Integration tests: OTLP/gRPC ingest
- [ ] E2E test: start server, send a trace, verify it appears in the API response

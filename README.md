[![CI](https://github.com/[owner]/litetrace/actions/workflows/ci.yml/badge.svg)](https://github.com/[owner]/litetrace/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

# LiteTrace

A dead-simple, single-binary OpenTelemetry observability server with LLM cost tracking.

## Quick Start

**Docker (recommended):**

```bash
docker run -p 3000:3000 -p 4317:4317 -p 4318:4318 ghcr.io/[owner]/litetrace:latest
```

Open http://localhost:3000, then point your OTLP exporter at:
- HTTP: `http://localhost:4318`
- gRPC: `localhost:4317`

**From source:**

```bash
git clone https://github.com/[owner]/litetrace
cd litetrace
bun install
bun run dev
```

## Features

- **Zero config** — SQLite database created automatically, no setup required
- **OTLP native** — gRPC (port 4317) and HTTP/JSON + Protobuf (port 4318)
- **LLM cost tracking** — auto-detects LLM spans, extracts tokens, calculates cost
- **SQLite by default** — switch to PostgreSQL with one config line
- **Built-in UI** — trace explorer, span waterfall, LLM observations
- **API key auth** — optional Bearer token auth for production deployments
- **Single binary** — one `bun` process, zero external dependencies
- **Fast** — 100,000+ spans/sec on a single core

## Configuration

Create `config.yaml` (or mount it at `/app/config.yaml` in Docker):

| Key | Default | Description |
|-----|---------|-------------|
| `server.port` | `3000` | Web UI + API port |
| `otlp.grpcPort` | `4317` | OTLP/gRPC port |
| `otlp.httpPort` | `4318` | OTLP/HTTP port |
| `storage.driver` | `sqlite` | `sqlite` or `postgres` |
| `storage.path` | `litetrace.db` | SQLite file path |
| `storage.dsn` | — | PostgreSQL DSN (if driver=postgres) |
| `auth.enabled` | `false` | Enable API key authentication |

## API Key Setup

Enable auth in `config.yaml` (`auth.enabled: true`), then open the Settings page in the UI to create and manage API keys. Send requests with `Authorization: Bearer <key>`.

## Benchmarks

OTLP/HTTP ingestion, 10 spans/request, 1 vCPU / 2 GB RAM:

| Concurrency | Req/s | Spans/s | p50 | p95 | p99 | Errors |
|-------------|-------|---------|-----|-----|-----|--------|
| 5 | 3,200 | 32,000 | 1.4ms | 3.8ms | 7.2ms | 0.0% |
| 20 | 8,100 | 81,000 | 2.3ms | 6.1ms | 11.4ms | 0.0% |
| 50 | 11,400 | 114,000 | 4.2ms | 9.8ms | 18.7ms | 0.0% |
| 100 | 12,300 | 123,000 | 7.8ms | 16.2ms | 29.3ms | 0.0% |

Run your own: `bun scripts/bench.ts`

## Comparison

| Feature | LiteTrace | Jaeger | Zipkin | Langfuse | Grafana Tempo |
|---------|-----------|--------|--------|----------|---------------|
| Single binary | ✓ | — | — | — | — |
| SQLite support | ✓ | — | — | — | — |
| LLM cost tracking | ✓ | — | — | ✓ | — |
| OTLP native | ✓ | ✓ | — | — | ✓ |
| Free & self-hosted | ✓ | ✓ | ✓ | ✓ | ✓ |
| Built-in UI | ✓ | ✓ | ✓ | ✓ | — |

## Development

```bash
bun install
bun run dev          # hot-reload dev server
SKIP_E2E=1 bun test  # unit + integration tests
bun scripts/bench.ts # run benchmark (requires running server)
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for PR conventions and setup notes.

## License

[MIT](LICENSE)

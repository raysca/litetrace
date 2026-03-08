---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

## Project: LiteTrace (SimpleOtel)

A dead-simple, single-binary observability server compatible with OpenTelemetry standards. Zero-config, SQLite-by-default, with Langfuse-like features for LLM tracing.

### Architecture

Five layers served from a single Bun process:
1. **OTLP Receiver** — gRPC on port 4317, HTTP on port 4318 (JSON + Protobuf)
2. **Trace Processor** — span hierarchy, LLM detection, cost calculation
3. **Storage Layer** — Drizzle ORM over SQLite (default) or PostgreSQL
4. **Query API** — REST endpoints at `/api/...`
5. **Web UI** — static assets served via `Bun.serve()` routes

### Database (Drizzle ORM)

Use Drizzle for all DB access. Four core tables: `traces`, `spans`, `observations` (LLM-specific), `metrics`.

- SQLite: use `bun:sqlite` adapter with Drizzle
- Postgres: use `Bun.sql` adapter with Drizzle
- Never use `better-sqlite3`, `pg`, or `postgres.js`

### Ports

| Service | Port |
|---------|------|
| Web UI | 3000 |
| OTLP/gRPC | 4317 |
| OTLP/HTTP | 4318 |

### LLM Span Detection

Automatically detect LLM spans via OpenTelemetry semantic conventions and map them to `observations` with: model, prompt, completion, token counts, and cost.

### Testing Structure

```
__tests__/
  processor/   # span-processor, trace-builder, llm-detector
  storage/     # trace-repository, query-builder, migration
  api/         # trace-api, validation
  utils/       # cost-calculator, otlp-converter
```

Use `bun test`. Target: 60% unit / 30% integration / 10% E2E.

---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

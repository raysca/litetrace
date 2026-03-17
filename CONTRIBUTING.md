# Contributing to LiteTrace

## Dev Setup

```bash
git clone https://github.com/[owner]/litetrace
cd litetrace
bun install
bun run dev      # starts on :3000, :4317, :4318
```

## Running Tests

```bash
bun test              # all tests (requires running server for E2E)
SKIP_E2E=1 bun test   # unit + integration only (recommended for local dev)
```

Tests are organized in `__tests__/`:
- `processor/` — span processor, trace builder, LLM detector
- `storage/` — trace repository, query builder, migrations
- `api/` — API handlers, validation
- `utils/` — cost calculator, OTLP converter
- `e2e/` — full round-trip tests (requires running server)

## PR Conventions

- One feature or fix per PR
- Unit tests for new behavior
- Keep PRs small and focused; open an issue first for large changes
- Run `SKIP_E2E=1 bun test` before pushing

## GitHub Pages Setup

The marketing site (`docs/`) deploys automatically via GitHub Actions on push to `main`.

**Required one-time manual step:** After the first `pages.yml` workflow run, go to:
> Repo Settings → Pages → Source → select **"GitHub Actions"**

Without this toggle, the deployment step will fail with a permissions error.

## GHCR Package Visibility

Docker images publish to `ghcr.io/[owner]/litetrace` via GitHub Actions.

**Required one-time manual step:** After the first `docker-publish.yml` workflow run, go to:
> GitHub → Your Profile → Packages → `litetrace` → Package Settings → Change visibility → **Public**

Without this, the image will be private and `docker pull` will require authentication.

## Database Migrations

After modifying `src/db/schema.ts`:

```bash
bunx drizzle-kit generate   # generates SQL in src/db/migrations/
bun run dev                  # auto-runs migrations on startup
```

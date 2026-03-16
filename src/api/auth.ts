import { getDb } from "../db/client";
import { apiKeys } from "../db/schema";
import { eq } from "drizzle-orm";

// ── Key generation ────────────────────────────────────────────────────────────

/** Generate a key, its SHA-256 hash, and display prefix. */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  const key    = "lt_" + hex;          // "lt_" + 64 hex chars = 67 chars total
  const prefix = key.slice(0, 11);     // "lt_" + first 8 hex chars, for display
  const hash   = hashKey(key);
  return { key, hash, prefix };
}

/** SHA-256 hash a key using Bun's built-in CryptoHasher. */
export function hashKey(key: string): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(key);
  return hasher.digest("hex");
}

// ── Request parsing ───────────────────────────────────────────────────────────

/** Extract the Bearer token from an Authorization header, or null. */
export function extractBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const spaceIdx = header.indexOf(" ");
  if (spaceIdx === -1) return null;
  const scheme = header.slice(0, spaceIdx).toLowerCase();
  const token  = header.slice(spaceIdx + 1).trim();
  if (scheme !== "bearer" || !token) return null;
  return token;
}

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * Validate a raw Bearer token against the DB.
 * Returns true if valid (and updates lastUsedAt).
 * Returns true unconditionally when no keys exist (auth disabled — zero-config default).
 */
export async function validateApiKey(token: string | null): Promise<boolean> {
  const db    = getDb();
  const count = db.select({ id: apiKeys.id }).from(apiKeys).all();

  // Zero keys → auth disabled, pass everything through
  if (count.length === 0) return true;

  // Keys exist — empty token is always rejected
  if (!token) return false;

  const hash  = hashKey(token);
  const match = db.select({ id: apiKeys.id })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, hash))
    .get();
  if (!match) return false;

  // Fire-and-forget: update lastUsedAt
  db.update(apiKeys)
    .set({ lastUsedAt: Date.now() })
    .where(eq(apiKeys.id, match.id))
    .run();

  return true;
}

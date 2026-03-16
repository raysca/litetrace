import { test, expect, describe, beforeEach, mock } from "bun:test";
import { createTestDb } from "../helpers/db";
import { generateApiKey, hashKey, extractBearerToken, validateApiKey } from "../../src/api/auth";
import { apiKeys } from "../../src/db/schema";

describe("generateApiKey", () => {
  test("returns key with lt_ prefix", () => {
    const { key } = generateApiKey();
    expect(key.startsWith("lt_")).toBe(true);
  });

  test("key is 67 chars (lt_ + 64 hex)", () => {
    const { key } = generateApiKey();
    expect(key.length).toBe(67);
  });

  test("prefix is lt_ + first 8 hex chars", () => {
    const { key, prefix } = generateApiKey();
    expect(prefix).toBe(key.slice(0, 11)); // "lt_" + 8 chars
  });

  test("hash is 64-char hex string", () => {
    const { hash } = generateApiKey();
    expect(hash.length).toBe(64);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  test("two keys are always different", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.key).not.toBe(b.key);
    expect(a.hash).not.toBe(b.hash);
  });
});

describe("hashKey", () => {
  test("same input always produces same hash", () => {
    const h1 = hashKey("lt_abc123");
    const h2 = hashKey("lt_abc123");
    expect(h1).toBe(h2);
  });

  test("different inputs produce different hashes", () => {
    expect(hashKey("lt_aaa")).not.toBe(hashKey("lt_bbb"));
  });
});

describe("extractBearerToken", () => {
  test("returns token from valid Authorization header", () => {
    const req = new Request("http://localhost:4318/v1/traces", {
      method: "POST",
      headers: { Authorization: "Bearer lt_abc123" },
    });
    expect(extractBearerToken(req)).toBe("lt_abc123");
  });

  test("returns null when header is missing", () => {
    const req = new Request("http://localhost:4318/v1/traces", { method: "POST" });
    expect(extractBearerToken(req)).toBeNull();
  });

  test("returns null for non-Bearer scheme", () => {
    const req = new Request("http://localhost:4318/v1/traces", {
      method: "POST",
      headers: { Authorization: "Basic abc123" },
    });
    expect(extractBearerToken(req)).toBeNull();
  });
});

// validateApiKey integration-style tests using an in-memory SQLite DB.
// We mock getDb() from src/db/client so validateApiKey uses our test DB
// (which has the full schema from migrations via createTestDb()).
describe("validateApiKey", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
    // Override the module-level getDb singleton for this test suite
    mock.module("../../src/db/client", () => ({ getDb: () => db }));
  });

  test("returns true when no keys exist (auth disabled)", async () => {
    // Empty DB → zero keys → auth disabled
    const result = await validateApiKey("");
    expect(result).toBe(true);
  });

  test("returns false for empty token when keys exist", async () => {
    const { hash, prefix } = generateApiKey();
    db.insert(apiKeys).values({
      id: "test-id-1",
      name: "test key",
      keyHash: hash,
      prefix,
      createdAt: Date.now(),
    }).run();

    const result = await validateApiKey("");
    expect(result).toBe(false);
  });

  test("returns true for a valid token when keys exist", async () => {
    const { key, hash, prefix } = generateApiKey();
    db.insert(apiKeys).values({
      id: "test-id-2",
      name: "test key",
      keyHash: hash,
      prefix,
      createdAt: Date.now(),
    }).run();

    const result = await validateApiKey(key);
    expect(result).toBe(true);
  });

  test("returns false for an invalid token when keys exist", async () => {
    const { hash, prefix } = generateApiKey();
    db.insert(apiKeys).values({
      id: "test-id-3",
      name: "test key",
      keyHash: hash,
      prefix,
      createdAt: Date.now(),
    }).run();

    const result = await validateApiKey("lt_wrongtoken");
    expect(result).toBe(false);
  });
});

import { handleListKeys, handleCreateKey, handleDeleteKey } from "../../src/api/handlers/keys";

describe("handleListKeys", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
    mock.module("../../src/db/client", () => ({ getDb: () => db }));
  });

  test("returns 200 with an array", async () => {
    const req = new Request("http://localhost:3000/api/keys");
    const res = await handleListKeys(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
  });

  test("returns array with keys when they exist", async () => {
    const { hash, prefix } = generateApiKey();
    db.insert(apiKeys).values({
      id: "test-id-1",
      name: "my-key",
      keyHash: hash,
      prefix,
      createdAt: Date.now(),
    }).run();

    const req = new Request("http://localhost:3000/api/keys");
    const res = await handleListKeys(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBe(1);
    expect(json[0].name).toBe("my-key");
    expect(json[0].id).toBe("test-id-1");
    expect(json[0].prefix).toBe(prefix);
  });
});

describe("handleCreateKey", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
    mock.module("../../src/db/client", () => ({ getDb: () => db }));
  });

  test("returns 201 with full key in response body", async () => {
    const req = new Request("http://localhost:3000/api/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "test-key" }),
    });
    const res = await handleCreateKey(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.key).toBeDefined();
    expect(json.key.startsWith("lt_")).toBe(true);
    expect(json.name).toBe("test-key");
    expect(json.prefix).toBeDefined();
    expect(json.id).toBeDefined();
  });

  test("returns 400 when name is missing", async () => {
    const req = new Request("http://localhost:3000/api/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await handleCreateKey(req);
    expect(res.status).toBe(400);
  });

  test("persists key to database", async () => {
    const req = new Request("http://localhost:3000/api/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "persisted-key" }),
    });
    const res = await handleCreateKey(req);
    expect(res.status).toBe(201);

    // Verify it was saved
    const rows = db.select().from(apiKeys).all();
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe("persisted-key");
  });
});

describe("handleDeleteKey", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
    mock.module("../../src/db/client", () => ({ getDb: () => db }));
  });

  test("returns 404 for non-existent key", async () => {
    const req = Object.assign(
      new Request("http://localhost:3000/api/keys/nonexistent"),
      { params: { id: "nonexistent" } }
    );
    const res = await handleDeleteKey(req as any);
    expect(res.status).toBe(404);
  });

  test("returns 204 when key is deleted", async () => {
    const { hash, prefix } = generateApiKey();
    db.insert(apiKeys).values({
      id: "test-delete",
      name: "deleteme",
      keyHash: hash,
      prefix,
      createdAt: Date.now(),
    }).run();

    const req = Object.assign(
      new Request("http://localhost:3000/api/keys/test-delete"),
      { params: { id: "test-delete" } }
    );
    const res = await handleDeleteKey(req as any);
    expect(res.status).toBe(204);

    // Verify it was deleted
    const rows = db.select().from(apiKeys).all();
    expect(rows.length).toBe(0);
  });
});

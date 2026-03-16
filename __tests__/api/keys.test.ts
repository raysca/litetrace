import { test, expect, describe } from "bun:test";
import { generateApiKey, hashKey, extractBearerToken } from "../../src/api/auth";

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

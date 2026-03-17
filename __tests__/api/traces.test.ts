import { test, expect, describe } from "bun:test";
import { handleListTraces } from "../../src/api/handlers/traces";

describe("handleListTraces", () => {
  test("parses latencyMin and latencyMax parameters", async () => {
    const req = new Request("http://localhost:3000/api/traces?latencyMin=100&latencyMax=500");
    const response = await handleListTraces(req);
    expect(response.status).toBe(200);
  });

  test("parses spanName parameter", async () => {
    const req = new Request("http://localhost:3000/api/traces?spanName=processRequest");
    const response = await handleListTraces(req);
    expect(response.status).toBe(200);
  });

  test("parses costMin and costMax parameters", async () => {
    const req = new Request("http://localhost:3000/api/traces?costMin=0.01&costMax=0.10");
    const response = await handleListTraces(req);
    expect(response.status).toBe(200);
  });

  test("validates invalid latencyMin parameter", async () => {
    const req = new Request("http://localhost:3000/api/traces?latencyMin=abc");
    const response = await handleListTraces(req);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.message).toContain("latencyMin must be a number");
  });

  test("validates invalid latencyMax parameter", async () => {
    const req = new Request("http://localhost:3000/api/traces?latencyMax=xyz");
    const response = await handleListTraces(req);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.message).toContain("latencyMax must be a number");
  });

  test("validates invalid costMin parameter", async () => {
    const req = new Request("http://localhost:3000/api/traces?costMin=invalid");
    const response = await handleListTraces(req);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.message).toContain("costMin must be a number");
  });

  test("validates invalid costMax parameter", async () => {
    const req = new Request("http://localhost:3000/api/traces?costMax=invalid");
    const response = await handleListTraces(req);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.message).toContain("costMax must be a number");
  });

  test("accepts all new filter parameters together", async () => {
    const req = new Request(
      "http://localhost:3000/api/traces?spanName=test&latencyMin=50&latencyMax=200&costMin=0.001&costMax=0.05"
    );
    const response = await handleListTraces(req);
    expect(response.status).toBe(200);
  });

  test("works with existing parameters", async () => {
    const req = new Request(
      "http://localhost:3000/api/traces?service=api&status=ok&spanName=request&latencyMin=100"
    );
    const response = await handleListTraces(req);
    expect(response.status).toBe(200);
  });
});

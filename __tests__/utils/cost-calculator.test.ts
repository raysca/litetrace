import { test, expect, describe } from "bun:test";
import { calculateCost, UNKNOWN_COST } from "../../src/utils/cost-calculator";

describe("calculateCost", () => {
  test("gpt-4o-mini: 1000 input + 500 output tokens", () => {
    const cost = calculateCost("gpt-4o-mini", 1000, 500);
    // $0.15/1M input = 0.00015, $0.60/1M output = 0.0003 → total 0.00045
    expect(cost).toBeCloseTo(0.00045, 8);
  });

  test("gpt-4o: 1000 input + 500 output tokens", () => {
    const cost = calculateCost("gpt-4o", 1000, 500);
    // $2.50/1M input = 0.0025, $10/1M output = 0.005 → total 0.0075
    expect(cost).toBeCloseTo(0.0075, 8);
  });

  test("unknown model returns UNKNOWN_COST sentinel (null)", () => {
    expect(calculateCost("some-unknown-model", 100, 100)).toBe(UNKNOWN_COST);
  });

  test("zero tokens returns 0", () => {
    expect(calculateCost("gpt-4o-mini", 0, 0)).toBe(0);
  });

  test("partial model match: gpt-4o-mini-2024-07-18 matches gpt-4o-mini", () => {
    const cost = calculateCost("gpt-4o-mini-2024-07-18", 1000, 500);
    expect(cost).toBeCloseTo(0.00045, 8);
  });

  test("negative token counts return UNKNOWN_COST", () => {
    expect(calculateCost("gpt-4o-mini", -1, 50)).toBe(UNKNOWN_COST);
    expect(calculateCost("gpt-4o-mini", 50, -1)).toBe(UNKNOWN_COST);
  });

  test("claude-3-haiku-20240307 matches claude-3-haiku", () => {
    const cost = calculateCost("claude-3-haiku-20240307", 1000, 500);
    // $0.25/1M input = 0.00025, $1.25/1M output = 0.000625 → total 0.000875
    expect(cost).toBeCloseTo(0.000875, 8);
  });
});

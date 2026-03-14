import { test, expect, describe } from "bun:test";
import { WelcomePage } from "../../src/ui/pages/WelcomePage";

describe("WelcomePage Component", () => {
  test("component exists and can be imported", () => {
    expect(WelcomePage).toBeDefined();
    expect(typeof WelcomePage).toBe("function");
  });
});

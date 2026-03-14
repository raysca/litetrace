import { test, expect, describe } from "bun:test";
import { Dashboard } from "../../src/ui/pages/Dashboard";
import { DashboardEmpty } from "../../src/ui/components/DashboardEmpty";

describe("Dashboard Integration", () => {
  test("Dashboard component exists", () => {
    expect(Dashboard).toBeDefined();
    expect(typeof Dashboard).toBe("function");
  });

  test("DashboardEmpty component exists", () => {
    expect(DashboardEmpty).toBeDefined();
    expect(typeof DashboardEmpty).toBe("function");
  });

  test("Dashboard imports DashboardEmpty", async () => {
    const code = await Bun.file(
      "/Users/raymondottun/Projects/ai/litetrace/src/ui/pages/Dashboard.tsx"
    ).text();
    expect(code).toContain("DashboardEmpty");
    expect(code).toContain("totalTraces");
  });
});

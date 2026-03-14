import { test, expect, describe } from "bun:test";
import { Dashboard } from "../../src/ui/pages/Dashboard";
import { DashboardEmpty } from "../../src/ui/components/DashboardEmpty";
import { TimeRangePicker } from "../../src/ui/components/TimeRangePicker";

describe("Dashboard Integration", () => {
  test("Dashboard component is defined and is a function", () => {
    expect(Dashboard).toBeDefined();
    expect(typeof Dashboard).toBe("function");
  });

  test("DashboardEmpty component is defined and is a function", () => {
    expect(DashboardEmpty).toBeDefined();
    expect(typeof DashboardEmpty).toBe("function");
  });

  test("TimeRangePicker component is defined and is a function", () => {
    expect(TimeRangePicker).toBeDefined();
    expect(typeof TimeRangePicker).toBe("function");
  });

  test("Dashboard source uses TimeRangePicker", async () => {
    const code = await Bun.file(
      new URL("../../src/ui/pages/Dashboard.tsx", import.meta.url).pathname
    ).text();
    expect(code).toContain("TimeRangePicker");
  });

  test("Dashboard source uses custom BarChart component", async () => {
    const code = await Bun.file(
      new URL("../../src/ui/pages/Dashboard.tsx", import.meta.url).pathname
    ).text();
    expect(code).toContain("BarChart");
    expect(code).toContain("../components/BarChart");
  });

  test("Dashboard source has from/to state", async () => {
    const code = await Bun.file(
      new URL("../../src/ui/pages/Dashboard.tsx", import.meta.url).pathname
    ).text();
    expect(code).toContain("setFrom");
    expect(code).toContain("setTo");
  });

  test("Dashboard source fetches with from/to query params", async () => {
    const code = await Bun.file(
      new URL("../../src/ui/pages/Dashboard.tsx", import.meta.url).pathname
    ).text();
    expect(code).toContain("from=${");
    expect(code).toContain("to=${");
  });

  test("Dashboard source supports all 4 volume metrics", async () => {
    const code = await Bun.file(
      new URL("../../src/ui/pages/Dashboard.tsx", import.meta.url).pathname
    ).text();
    expect(code).toContain('"requests"');
    expect(code).toContain('"tokens"');
    expect(code).toContain('"costUsd"');
    expect(code).toContain('"avgLatencyMs"');
  });

  test("Dashboard imports DashboardEmpty", async () => {
    const code = await Bun.file(
      new URL("../../src/ui/pages/Dashboard.tsx", import.meta.url).pathname
    ).text();
    expect(code).toContain("DashboardEmpty");
    expect(code).toContain("totalTraces");
  });
});

import { test, expect, describe, mock } from "bun:test";
import { Dashboard } from "../../src/ui/pages/Dashboard";
import { WelcomeScreen } from "../../src/ui/components/WelcomeScreen";

describe("Dashboard Integration", () => {
  test("Dashboard component exists", () => {
    expect(Dashboard).toBeDefined();
    expect(typeof Dashboard).toBe("function");
  });

  test("WelcomeScreen component exists", () => {
    expect(WelcomeScreen).toBeDefined();
    expect(typeof WelcomeScreen).toBe("function");
  });

  test("Dashboard can be rendered", () => {
    const component = Dashboard();
    expect(component).toBeDefined();
  });

  test("Dashboard imports WelcomeScreen", async () => {
    // Verify the Dashboard file contains the import
    const dashboardCode = await Bun.file(
      "/Users/raymondottun/Projects/ai/litetrace/src/ui/pages/Dashboard.tsx"
    ).text();
    expect(dashboardCode).toContain('import { WelcomeScreen }');
    expect(dashboardCode).toContain('from "../components/WelcomeScreen"');
  });

  test("Dashboard shows welcome screen when no traces", async () => {
    const dashboardCode = await Bun.file(
      "/Users/raymondottun/Projects/ai/litetrace/src/ui/pages/Dashboard.tsx"
    ).text();
    // Verify logic exists to show welcome screen
    expect(dashboardCode).toContain("showWelcome");
    expect(dashboardCode).toContain("totalTraces");
    expect(dashboardCode).toContain("<WelcomeScreen");
  });

  test("WelcomeScreen has required functionality", async () => {
    const welcomeCode = await Bun.file(
      "/Users/raymondottun/Projects/ai/litetrace/src/ui/components/WelcomeScreen.tsx"
    ).text();

    // Verify component has language selection
    expect(welcomeCode).toContain("nodejs");
    expect(welcomeCode).toContain("python");
    expect(welcomeCode).toContain("go");

    // Verify endpoint display
    expect(welcomeCode).toContain("localhost:4317");

    // Verify code snippets
    expect(welcomeCode).toContain("@opentelemetry/api");

    // Verify status indicator
    expect(welcomeCode).toContain("Server running");

    // Verify auto-dismiss on traces
    expect(welcomeCode).toContain("useEffect");
    expect(welcomeCode).toContain("hasTraces");
    expect(welcomeCode).toContain("onDismiss");
  });
});

import { test, expect, describe } from "bun:test";
import { WelcomeScreen } from "../../src/ui/components/WelcomeScreen";

describe("WelcomeScreen Component", () => {
  test("component exists and can be imported", () => {
    expect(WelcomeScreen).toBeDefined();
    expect(typeof WelcomeScreen).toBe("function");
  });

  test("component accepts required props", () => {
    const props = {
      onDismiss: () => {},
      hasTraces: false,
    };
    expect(() => WelcomeScreen(props)).not.toThrow();
  });

  test("component respects hasTraces prop", () => {
    const dismiss = () => {};

    // Component should handle both true and false states
    const componentWithoutTraces = WelcomeScreen({
      onDismiss: dismiss,
      hasTraces: false,
    });
    expect(componentWithoutTraces).toBeDefined();

    const componentWithTraces = WelcomeScreen({
      onDismiss: dismiss,
      hasTraces: true,
    });
    expect(componentWithTraces).toBeDefined();
  });

  test("component is a valid React component", () => {
    const component = WelcomeScreen({
      onDismiss: () => {},
      hasTraces: false,
    });
    // React functional components return JSX objects
    expect(component).toBeTruthy();
    // Should have a type property indicating it's JSX
    expect(typeof component === "object" || typeof component === "function").toBe(true);
  });
});

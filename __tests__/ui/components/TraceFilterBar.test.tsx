import { test, expect, describe, mock } from "bun:test";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TraceFilterBar } from "../../../src/ui/components/filters/TraceFilterBar";

global.fetch = mock(() =>
  Promise.resolve({
    json: () => Promise.resolve(["api-gateway", "user-service"]),
  } as Response)
) as any;

describe("TraceFilterBar", () => {
  test("renders core filter UI elements", () => {
    render(<TraceFilterBar onFilter={() => {}} onRefresh={() => {}} />);
    expect(screen.getByText("Filters")).toBeDefined();
    expect(screen.getByText("Apply")).toBeDefined();
    expect(screen.getByTitle("Clear filters")).toBeDefined();
  });

  test("calls onFilter when Apply button is clicked", () => {
    const calls: any[] = [];
    render(<TraceFilterBar onFilter={f => calls.push(f)} onRefresh={() => {}} />);

    fireEvent.click(screen.getByText("Apply"));

    expect(calls.length).toBe(1);
  });

  test("calls onFilter with status when status select changes", () => {
    const calls: any[] = [];
    render(<TraceFilterBar onFilter={f => calls.push(f)} onRefresh={() => {}} />);

    // Status is the second <select> (after service)
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[1]!, { target: { value: "error" } });
    fireEvent.click(screen.getByText("Apply"));

    const last = calls[calls.length - 1];
    expect(last.status).toBe("error");
  });

  test("calls onFilter({}) when Clear button is clicked", () => {
    const calls: any[] = [];
    render(<TraceFilterBar onFilter={f => calls.push(f)} onRefresh={() => {}} />);

    // Set a filter, then clear
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[1]!, { target: { value: "error" } });
    fireEvent.click(screen.getByTitle("Clear filters"));

    const last = calls[calls.length - 1];
    expect(last).toEqual({});
  });

  test("calls onFilter with spanName when Enter is pressed in span input", () => {
    const calls: any[] = [];
    render(<TraceFilterBar onFilter={f => calls.push(f)} onRefresh={() => {}} />);

    const spanInput = screen.getByPlaceholderText("All");
    fireEvent.change(spanInput, { target: { value: "my-span" } });
    fireEvent.keyDown(spanInput, { key: "Enter" });

    const last = calls[calls.length - 1];
    expect(last.spanName).toBe("my-span");
  });

  test("applies latency preset when preset button is clicked", () => {
    const calls: any[] = [];
    render(<TraceFilterBar onFilter={f => calls.push(f)} onRefresh={() => {}} />);

    fireEvent.click(screen.getByText("< 100ms"));
    fireEvent.click(screen.getByText("Apply"));

    const last = calls[calls.length - 1];
    expect(last.latencyMaxMs).toBe(100);
    expect(last.latencyMinMs).toBeUndefined();
  });

  test("applies cost preset when preset button is clicked", () => {
    const calls: any[] = [];
    render(<TraceFilterBar onFilter={f => calls.push(f)} onRefresh={() => {}} />);

    fireEvent.click(screen.getByText("> $0.10"));
    fireEvent.click(screen.getByText("Apply"));

    const last = calls[calls.length - 1];
    expect(last.costMinUsd).toBe(0.10);
    expect(last.costMaxUsd).toBeUndefined();
  });

  test("loads service options from /api/services", async () => {
    render(<TraceFilterBar onFilter={() => {}} onRefresh={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("api-gateway")).toBeDefined();
    });
  });
});

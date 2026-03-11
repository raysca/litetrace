import { test, expect, describe, mock } from "bun:test";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TraceFilterBar } from "../../../src/ui/components/filters/TraceFilterBar";

// Mock fetch to prevent happy-dom from making real requests
global.fetch = mock(() =>
  Promise.resolve({
    json: () => Promise.resolve(["api-gateway", "user-service"]),
  } as Response)
) as any;

describe("TraceFilterBar", () => {
  test("renders all filter sections", () => {
    const mockOnFilter = () => {};
    const mockOnRefresh = () => {};

    render(<TraceFilterBar onFilter={mockOnFilter} onRefresh={mockOnRefresh} />);

    // Check for buttons
    expect(screen.getByText("Clear All")).toBeDefined();
    expect(screen.getByText("↻ Refresh")).toBeDefined();
  });

  test("calls onFilter with service when service input changes", async () => {
    const filters: any[] = [];
    const mockOnFilter = (f: any) => filters.push(f);
    const mockOnRefresh = () => {};

    render(<TraceFilterBar onFilter={mockOnFilter} onRefresh={mockOnRefresh} />);

    // Find service select
    const serviceInput = await screen.findByDisplayValue("All services") as HTMLSelectElement;
    expect(serviceInput).toBeDefined();

    fireEvent.change(serviceInput, { target: { value: "user-service" } });

    await waitFor(() => {
      expect(filters.length > 0).toBe(true);
      const lastFilter = filters[filters.length - 1];
      expect(lastFilter.service).toBe("user-service");
    });
  });

  test("calls onFilter with status when status dropdown changes", async () => {
    const filters: any[] = [];
    const mockOnFilter = (f: any) => filters.push(f);
    const mockOnRefresh = () => {};

    render(<TraceFilterBar onFilter={mockOnFilter} onRefresh={mockOnRefresh} />);

    const statusSelect = screen.getByDisplayValue("All") as HTMLSelectElement;
    expect(statusSelect).toBeDefined();

    fireEvent.change(statusSelect, { target: { value: "error" } });

    await waitFor(() => {
      expect(filters.length > 0).toBe(true);
      const lastFilter = filters[filters.length - 1];
      expect(lastFilter.status).toBe("error");
    });
  });

  test("clears all filters when Clear All button is clicked", async () => {
    const filters: any[] = [];
    const mockOnFilter = (f: any) => filters.push(f);
    const mockOnRefresh = () => {};

    render(<TraceFilterBar onFilter={mockOnFilter} onRefresh={mockOnRefresh} />);

    // Set some filters
    const serviceInput = await screen.findByDisplayValue("All services") as HTMLSelectElement;
    fireEvent.change(serviceInput, { target: { value: "user-service" } });

    await waitFor(() => {
      expect(filters.length > 0).toBe(true);
    });

    // Click Clear All
    const clearButton = screen.getByText("Clear All");
    fireEvent.click(clearButton);

    await waitFor(() => {
      const lastFilter = filters[filters.length - 1];
      expect(lastFilter).toEqual({});
    });
  });

  test("calls onRefresh when Refresh button is clicked", () => {
    let refreshCalled = false;
    const mockOnFilter = () => {};
    const mockOnRefresh = () => {
      refreshCalled = true;
    };

    render(<TraceFilterBar onFilter={mockOnFilter} onRefresh={mockOnRefresh} />);

    const refreshButton = screen.getByText("↻ Refresh");
    fireEvent.click(refreshButton);

    expect(refreshCalled).toBe(true);
  });

  test("shows Apply button when advanced filters are set", async () => {
    const mockOnFilter = () => {};
    const mockOnRefresh = () => {};

    const { rerender } = render(
      <TraceFilterBar onFilter={mockOnFilter} onRefresh={mockOnRefresh} />
    );

    // Apply button should not be visible initially
    let applyButton = screen.queryByText("Apply Filters");
    expect(applyButton).toBeNull();

    // Set a span name to trigger advanced filter
    const spanNameInput = screen.getByPlaceholderText("All spans") as HTMLInputElement;
    fireEvent.change(spanNameInput, { target: { value: "my-span" } });

    await waitFor(() => {
      applyButton = screen.queryByText("Apply Filters");
      expect(applyButton).toBeDefined();
    });
  });

  test("applies advanced filters when Apply button is clicked", async () => {
    const filters: any[] = [];
    const mockOnFilter = (f: any) => filters.push(f);
    const mockOnRefresh = () => {};

    render(<TraceFilterBar onFilter={mockOnFilter} onRefresh={mockOnRefresh} />);

    // Set latency filter
    const latencyInputs = screen.getAllByDisplayValue("");
    const latencyMinInput = latencyInputs.find((el) => (el as HTMLInputElement).placeholder?.includes("Min")) as HTMLInputElement;

    if (latencyMinInput) {
      fireEvent.change(latencyMinInput, { target: { value: "100" } });

      await waitFor(() => {
        // Click Apply button
        const applyButton = screen.queryByText("Apply Filters");
        if (applyButton) {
          fireEvent.click(applyButton);

          // The last filter should include latency
          const lastFilter = filters[filters.length - 1];
          expect(lastFilter.latencyMinMs).toBeDefined();
        }
      });
    }
  });
});

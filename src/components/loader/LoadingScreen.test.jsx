import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import LoadingScreen from "./LoadingScreen";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("LoadingScreen", () => {
  it("shows the spinner while isLoading=true", () => {
    render(
      <LoadingScreen isLoading={true} minDuration={500}>
        <div>Data</div>
      </LoadingScreen>,
    );
    expect(screen.getByText("Loading data...")).toBeInTheDocument();
    expect(screen.queryByText("Data")).not.toBeInTheDocument();
  });

  it("renders custom loadingContent when provided", () => {
    render(
      <LoadingScreen
        isLoading={true}
        loadingContent={<span>Crunching numbers…</span>}
      >
        <div>Data</div>
      </LoadingScreen>,
    );
    expect(screen.getByText("Crunching numbers…")).toBeInTheDocument();
  });

  it("shows children when isLoading=false from the start", () => {
    render(
      <LoadingScreen isLoading={false}>
        <div>Data</div>
      </LoadingScreen>,
    );
    expect(screen.getByText("Data")).toBeInTheDocument();
  });

  it("keeps spinner up for at least minDuration after loading flips false", () => {
    const { rerender } = render(
      <LoadingScreen isLoading={true} minDuration={500}>
        <div>Data</div>
      </LoadingScreen>,
    );
    rerender(
      <LoadingScreen isLoading={false} minDuration={500}>
        <div>Data</div>
      </LoadingScreen>,
    );
    // Still loading — minDuration not yet elapsed
    expect(screen.queryByText("Data")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByText("Data")).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// setupTests globally mocks useCountUp. Restore the real implementation here.
vi.unmock("./useCountUp");
const { useCountUp } = await vi.importActual("./useCountUp");

describe("useCountUp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    let frame = 0;
    vi.stubGlobal("requestAnimationFrame", (cb) => {
      frame += 16;
      return setTimeout(() => cb(performance.now() + frame), 16);
    });
    vi.stubGlobal("cancelAnimationFrame", (id) => clearTimeout(id));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("starts at 0 before animation begins", () => {
    const { result } = renderHook(() => useCountUp(100));
    expect(result.current).toBe(0);
  });

  it("ends at the target value after the animation duration", () => {
    const { result } = renderHook(() => useCountUp(100, { duration: 100 }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(100);
  });

  it("honors the delay option before animating", () => {
    const { result } = renderHook(() => useCountUp(50, { delay: 50 }));
    act(() => {
      vi.advanceTimersByTime(10);
    });
    // Still at 0 — delay not yet elapsed
    expect(result.current).toBe(0);
  });
});

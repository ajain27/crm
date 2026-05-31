import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useIdleLogout from "./useIdleLogout";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useIdleLogout", () => {
  it("does nothing when currentUser is null", () => {
    const onTimeout = vi.fn();
    renderHook(() =>
      useIdleLogout({ currentUser: null, timeoutMs: 1000, onTimeout }),
    );
    act(() => vi.advanceTimersByTime(2000));
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("calls onTimeout after timeoutMs of inactivity", () => {
    const onTimeout = vi.fn();
    renderHook(() =>
      useIdleLogout({
        currentUser: { id: "u" },
        timeoutMs: 1000,
        onTimeout,
      }),
    );
    act(() => vi.advanceTimersByTime(1100));
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("resets the idle timer on user activity", () => {
    const onTimeout = vi.fn();
    renderHook(() =>
      useIdleLogout({
        currentUser: { id: "u" },
        timeoutMs: 1000,
        onTimeout,
      }),
    );
    act(() => vi.advanceTimersByTime(800));
    act(() => {
      window.dispatchEvent(new Event("mousemove"));
    });
    act(() => vi.advanceTimersByTime(500));
    expect(onTimeout).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(600));
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("removes listeners on unmount", () => {
    const onTimeout = vi.fn();
    const { unmount } = renderHook(() =>
      useIdleLogout({
        currentUser: { id: "u" },
        timeoutMs: 1000,
        onTimeout,
      }),
    );
    unmount();
    act(() => vi.advanceTimersByTime(2000));
    expect(onTimeout).not.toHaveBeenCalled();
  });
});

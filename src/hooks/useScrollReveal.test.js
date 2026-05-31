import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import useScrollReveal from "./useScrollReveal";

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useScrollReveal", () => {
  it("immediately reveals elements when prefers-reduced-motion is set", () => {
    const target = document.createElement("div");
    target.setAttribute("data-reveal", "");
    document.body.appendChild(target);

    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true, media: "", addListener: vi.fn() })),
    );

    renderHook(() => useScrollReveal());
    expect(target.classList.contains("is-revealed")).toBe(true);
  });

  it("immediately reveals when IntersectionObserver is unavailable", () => {
    const target = document.createElement("div");
    target.setAttribute("data-reveal-group", "");
    document.body.appendChild(target);

    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false, media: "", addListener: vi.fn() })),
    );
    const original = window.IntersectionObserver;
    delete window.IntersectionObserver;

    try {
      renderHook(() => useScrollReveal());
      expect(target.classList.contains("is-revealed")).toBe(true);
    } finally {
      window.IntersectionObserver = original;
    }
  });

  it("uses IntersectionObserver when available", () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    const ObserverMock = vi.fn(function (cb) {
      this.observe = observe;
      this.disconnect = disconnect;
      this.cb = cb;
    });
    vi.stubGlobal("IntersectionObserver", ObserverMock);
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false, media: "", addListener: vi.fn() })),
    );

    const target = document.createElement("div");
    target.setAttribute("data-reveal", "");
    document.body.appendChild(target);

    renderHook(() => useScrollReveal());
    expect(observe).toHaveBeenCalledWith(target);
  });
});

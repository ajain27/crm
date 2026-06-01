import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

beforeEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

async function loadHook() {
  vi.resetModules();
  const mod = await import("./usePrimeRate");
  return mod.usePrimeRate;
}

describe("usePrimeRate", () => {
  it("returns the fallback rate when no cache and no API key", async () => {
    const usePrimeRate = await loadHook();
    const { result } = renderHook(() => usePrimeRate());
    expect(result.current.rate).toBe(6.75);
    expect(result.current.source).toBe("fallback");
    expect(result.current.error).toBeNull();
  });

  it("reads from localStorage cache when fresh", async () => {
    localStorage.setItem(
      "primeRate_cache_v1",
      JSON.stringify({
        rate: 7.25,
        asOf: "2026-05-01",
        fetchedAt: Date.now() - 1000,
      }),
    );
    const usePrimeRate = await loadHook();
    const { result } = renderHook(() => usePrimeRate());
    expect(result.current.rate).toBe(7.25);
    expect(result.current.source).toBe("cache");
  });

  it("ignores stale cache entries (older than 24h)", async () => {
    localStorage.setItem(
      "primeRate_cache_v1",
      JSON.stringify({
        rate: 6.0,
        asOf: "2025-01-01",
        fetchedAt: Date.now() - 25 * 60 * 60 * 1000,
      }),
    );
    const usePrimeRate = await loadHook();
    const { result } = renderHook(() => usePrimeRate());
    expect(result.current.rate).toBe(6.75); // falls back
    expect(result.current.source).toBe("fallback");
  });

  it("does not fetch when no FRED API key is set", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    const usePrimeRate = await loadHook();
    renderHook(() => usePrimeRate());
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetches from FRED and caches when API key is set", async () => {
    vi.stubEnv("VITE_FRED_API_KEY", "test-key");
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        observations: [{ date: "2026-05-30", value: "7.00" }],
      }),
    });
    const usePrimeRate = await loadHook();
    const { result } = renderHook(() => usePrimeRate());
    await waitFor(() => expect(result.current.source).toBe("fred"));
    expect(result.current.rate).toBe(7.0);
    expect(result.current.asOf).toBe("2026-05-30");
    const cached = JSON.parse(localStorage.getItem("primeRate_cache_v1"));
    expect(cached.rate).toBe(7.0);
  });

  it("falls back gracefully when FRED fetch errors", async () => {
    vi.stubEnv("VITE_FRED_API_KEY", "test-key");
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network"));
    const usePrimeRate = await loadHook();
    const { result } = renderHook(() => usePrimeRate());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.rate).toBe(6.75); // still the fallback
  });

  it("falls back when FRED returns malformed JSON", async () => {
    vi.stubEnv("VITE_FRED_API_KEY", "test-key");
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ observations: [{}] }),
    });
    const usePrimeRate = await loadHook();
    const { result } = renderHook(() => usePrimeRate());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.rate).toBe(6.75);
  });
});

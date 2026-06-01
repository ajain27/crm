import { useEffect, useState } from "react";

// Fallback used when no cached value and no FRED API key is configured.
// Update when the Fed moves rates (Prime = upper bound of fed funds target + 3.00).
// Set VITE_FRED_API_KEY in your env to fetch the live value from FRED (DPRIME).
const FALLBACK_PRIME_RATE = 6.75;
const FALLBACK_AS_OF = "2026-05-31";

const CACHE_KEY = "primeRate_cache_v1";
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.rate !== "number" ||
      typeof parsed?.fetchedAt !== "number"
    ) {
      return null;
    }
    if (Date.now() - parsed.fetchedAt > CACHE_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(rate, asOf) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ rate, asOf, fetchedAt: Date.now() }),
    );
  } catch {
    /* localStorage unavailable or full — silently ignore */
  }
}

export function usePrimeRate() {
  const [state, setState] = useState(() => {
    const cached = readCache();
    if (cached) {
      return {
        rate: cached.rate,
        asOf: cached.asOf,
        loading: false,
        error: null,
        source: "cache",
      };
    }
    return {
      rate: FALLBACK_PRIME_RATE,
      asOf: FALLBACK_AS_OF,
      loading: false,
      error: null,
      source: "fallback",
    };
  });

  useEffect(() => {
    if (readCache()) return; // fresh cached value — skip refetch
    const apiKey = import.meta.env?.VITE_FRED_API_KEY;
    if (!apiKey) return; // no key — stick with fallback

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));
    (async () => {
      try {
        const url =
          `https://api.stlouisfed.org/fred/series/observations` +
          `?series_id=DPRIME&sort_order=desc&limit=1` +
          `&api_key=${apiKey}&file_type=json`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const obs = data?.observations?.[0];
        const rate = Number(obs?.value);
        if (!obs?.date || !Number.isFinite(rate)) {
          throw new Error("Malformed FRED response");
        }
        writeCache(rate, obs.date);
        if (!cancelled) {
          setState({
            rate,
            asOf: obs.date,
            loading: false,
            error: null,
            source: "fred",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err?.message || String(err),
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

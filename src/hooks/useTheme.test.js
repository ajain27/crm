import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useTheme from "./useTheme";

const KEY = "crmTheme";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

afterEach(() => {
  document.documentElement.classList.remove("dark");
});

describe("useTheme", () => {
  it("defaults to 'light' when localStorage is empty", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
  });

  it("reads initial theme from localStorage", () => {
    localStorage.setItem(KEY, "dark");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
  });

  it("persists theme to localStorage when it changes", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("dark"));
    expect(localStorage.getItem(KEY)).toBe("dark");
  });

  it("toggleTheme flips light → dark → light", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("dark");
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("light");
  });

  it("applies 'dark' class to <html> when theme is dark", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("dark"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes 'dark' class from <html> when switched back to light", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("dark"));
    act(() => result.current.setTheme("light"));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

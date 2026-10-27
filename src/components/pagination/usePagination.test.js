import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { PAGE_SIZE, paginate, usePagination } from "./usePagination";

const rows = (n) => Array.from({ length: n }, (_, i) => i);

describe("paginate", () => {
  it("shows 20 rows a page, with the range shown", () => {
    expect(PAGE_SIZE).toBe(20);
    const page2 = paginate(rows(45), 2);
    expect(page2).toMatchObject({
      totalPages: 3,
      page: 2,
      from: 21,
      to: 40,
      total: 45,
    });
    expect(page2.pageItems).toEqual(rows(40).slice(20));
  });

  it("clamps a page past the end, and handles an empty list", () => {
    expect(paginate(rows(5), 9)).toMatchObject({ page: 1, from: 1, to: 5 });
    expect(paginate([], 1)).toMatchObject({ totalPages: 1, from: 0, to: 0 });
  });
});

describe("usePagination", () => {
  it("goes back to page 1 when a filter changes", () => {
    const { result, rerender } = renderHook(
      ({ filter }) => usePagination(rows(50), { resetOn: [filter] }),
      { initialProps: { filter: "a" } },
    );
    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);
    rerender({ filter: "b" });
    expect(result.current.page).toBe(1);
  });
});

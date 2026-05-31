import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Pagination from "./Pagination";

describe("Pagination", () => {
  it("renders the child summary slot", () => {
    render(
      <Pagination currentPage={1} totalPages={3} setCurrentPage={vi.fn()}>
        <span>Showing 25 items</span>
      </Pagination>,
    );
    expect(screen.getByText("Showing 25 items")).toBeInTheDocument();
  });

  it("does not render Prev/Next when totalPages <= 1", () => {
    render(
      <Pagination currentPage={1} totalPages={1} setCurrentPage={vi.fn()}>
        <span>1 item</span>
      </Pagination>,
    );
    expect(screen.queryByText(/Prev/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Next/i)).not.toBeInTheDocument();
  });

  it("renders Page n of m when totalPages > 1", () => {
    render(
      <Pagination currentPage={2} totalPages={4} setCurrentPage={vi.fn()}>
        x
      </Pagination>,
    );
    expect(screen.getByText("Page 2 of 4")).toBeInTheDocument();
  });

  it("disables Prev on first page, Next on last page", () => {
    const { rerender } = render(
      <Pagination currentPage={1} totalPages={3} setCurrentPage={vi.fn()}>
        x
      </Pagination>,
    );
    expect(screen.getByRole("button", { name: /Prev/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Next/i })).not.toBeDisabled();

    rerender(
      <Pagination currentPage={3} totalPages={3} setCurrentPage={vi.fn()}>
        x
      </Pagination>,
    );
    expect(screen.getByRole("button", { name: /Prev/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /Next/i })).toBeDisabled();
  });

  it("calls setCurrentPage with a reducer when Next clicked", () => {
    const setCurrentPage = vi.fn();
    render(
      <Pagination
        currentPage={2}
        totalPages={3}
        setCurrentPage={setCurrentPage}
      >
        x
      </Pagination>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    const reducer = setCurrentPage.mock.calls[0][0];
    expect(reducer(2)).toBe(3);
    expect(reducer(3)).toBe(3); // clamped to totalPages
  });

  it("calls setCurrentPage with a reducer when Prev clicked", () => {
    const setCurrentPage = vi.fn();
    render(
      <Pagination
        currentPage={2}
        totalPages={3}
        setCurrentPage={setCurrentPage}
      >
        x
      </Pagination>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Prev/i }));
    const reducer = setCurrentPage.mock.calls[0][0];
    expect(reducer(2)).toBe(1);
    expect(reducer(1)).toBe(1); // clamped to 1
  });
});

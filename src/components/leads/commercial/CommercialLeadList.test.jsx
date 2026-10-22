import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CommercialLeadList from "./CommercialLeadList";

const listState = {
  search: "",
  setSearch: vi.fn(),
  page: 1,
  setPage: vi.fn(),
  filters: {},
  setFilter: vi.fn(),
  clearFilters: vi.fn(),
  hasFilters: false,
  selectedIds: new Set(),
  toggleSelected: vi.fn(),
  setManySelected: vi.fn(),
  clearSelected: vi.fn(),
};

describe("CommercialLeadList", () => {
  it("opens the website without also opening the lead", () => {
    const onOpen = vi.fn();
    render(
      <CommercialLeadList
        leads={[
          {
            id: "c1",
            name: "Yacht Haven",
            address: "2323 W State Rd 84",
            website: "https://yachthavenpark.com/",
          },
        ]}
        listState={listState}
        onOpen={onOpen}
        onDelete={vi.fn()}
        onBulkDelete={vi.fn()}
        onImport={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("link", { name: /Site/ }));
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("2323 W State Rd 84"));
    expect(onOpen).toHaveBeenCalled();
  });
});

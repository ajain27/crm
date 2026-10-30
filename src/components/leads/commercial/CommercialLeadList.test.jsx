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

  it("shows the seller's first and last name together", () => {
    render(
      <CommercialLeadList
        leads={[
          { id: "a", name: "Park A", firstName: "Ann", lastName: "Bell" },
          { id: "b", name: "Park B", sellerName: "Old Combined" },
        ]}
        listState={listState}
        onOpen={vi.fn()}
        onDelete={vi.fn()}
        onBulkDelete={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("columnheader", { name: "Seller Name" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ann Bell")).toBeInTheDocument();
    expect(screen.getByText("Old Combined")).toBeInTheDocument();
  });

  it("heads each small-screen card with the seller's name over the address", () => {
    const { container } = render(
      <CommercialLeadList
        leads={[
          {
            id: "a",
            name: "Park A",
            firstName: "Ann",
            lastName: "Bell",
            address: "1 Lake Rd, Ocala, FL",
          },
          // No seller name: the business name heads the card.
          { id: "b", name: "Park B", address: "2 Lake Rd, Ocala, FL" },
        ]}
        listState={listState}
        onOpen={vi.fn()}
        onDelete={vi.fn()}
        onBulkDelete={vi.fn()}
      />,
    );
    const cards = [...container.querySelectorAll(".acc-card-summary")].map(
      (summary) => summary.textContent,
    );
    expect(cards).toEqual([
      "Ann Bell1 Lake Rd, Ocala, FL",
      "Park B2 Lake Rd, Ocala, FL",
    ]);
  });

  it("resizes a column by dragging its header edge and remembers it", () => {
    localStorage.clear();
    const { container, unmount } = render(
      <CommercialLeadList
        leads={[{ id: "a", name: "Park A" }]}
        listState={listState}
        onOpen={vi.fn()}
        onDelete={vi.fn()}
        onBulkDelete={vi.fn()}
      />,
    );
    const nameTh = screen.getByRole("columnheader", { name: "Name" });
    const handle = nameTh.querySelector(".col-resize-handle");
    expect(handle).not.toBeNull();

    // jsdom has no PointerEvent; a MouseEvent carries the position.
    const pointer = (type, clientX) =>
      fireEvent(handle, new MouseEvent(type, { bubbles: true, clientX }));
    pointer("pointerdown", 100);
    pointer("pointermove", 300);
    pointer("pointerup", 300);

    // jsdom has no layout, so columns start at 0 wide: 0 + 200 dragged.
    expect(nameTh.style.width).toBe("200px");
    const table = container.querySelector("table");
    expect(table.style.tableLayout).toBe("fixed");

    unmount();
    render(
      <CommercialLeadList
        leads={[{ id: "a", name: "Park A" }]}
        listState={listState}
        onOpen={vi.fn()}
        onDelete={vi.fn()}
        onBulkDelete={vi.fn()}
      />,
    );
    expect(screen.getByRole("columnheader", { name: "Name" }).style.width).toBe(
      "200px",
    );

    fireEvent.doubleClick(
      screen
        .getByRole("columnheader", { name: "Name" })
        .querySelector(".col-resize-handle"),
    );
    expect(screen.getByRole("columnheader", { name: "Name" }).style.width).toBe(
      "",
    );
  });

  it("opens the lead from anywhere in the row except its controls", () => {
    const onOpen = vi.fn();
    render(
      <CommercialLeadList
        leads={[
          {
            id: "c1",
            name: "Yacht Haven",
            address: "2323 W State Rd 84",
            phone: "516-695-1008",
          },
        ]}
        listState={listState}
        onOpen={onOpen}
        onDelete={vi.fn()}
        onBulkDelete={vi.fn()}
      />,
    );
    const row = screen.getByText("2323 W State Rd 84").closest("tr");

    // The name heading (the card toggle on phones) and the phone cell's
    // empty space both open the lead.
    fireEvent.click(screen.getByText("Yacht Haven"));
    expect(onOpen).toHaveBeenCalledTimes(1);
    const phoneCell = row.querySelector('td[data-label="Phone"]');
    fireEvent.click(phoneCell);
    expect(onOpen).toHaveBeenCalledTimes(2);

    // The phone link and the select checkbox don't.
    fireEvent.click(screen.getByRole("link", { name: "516-695-1008" }));
    fireEvent.click(row.querySelector(".buyer-checkbox-cell"));
    expect(onOpen).toHaveBeenCalledTimes(2);
  });
});

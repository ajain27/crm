import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LeadExportButton from "./LeadExportButton";
import { downloadCsv } from "../leadExport";

vi.mock("../leadExport", async (importOriginal) => ({
  ...(await importOriginal()),
  downloadCsv: vi.fn(),
}));

const leads = [
  { id: "1", sellerName: "Jane Doe", email: "jane@x.com" },
  { id: "2", sellerName: "Bob Roe", phone: "555-1212" },
];

describe("LeadExportButton", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders nothing until leads are selected", () => {
    const { container } = render(
      <LeadExportButton selectedLeads={[]} listTitle="PPL Leads" />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("downloads the selected leads as CSV", () => {
    render(<LeadExportButton selectedLeads={leads} listTitle="PPL Leads" />);
    fireEvent.click(screen.getByText("Export CSV (2)"));
    const [rows, baseName] = downloadCsv.mock.calls[0];
    expect(rows).toHaveLength(3);
    expect(rows[1][0]).toBe("Jane Doe");
    expect(baseName).toMatch(/^ppl-leads-/);
  });
});
